"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Metrica } from "@/db/schema";
import { api } from "@/lib/live";
import type { CasaJson } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TarjetaReloj } from "./tarjeta-reloj";
import { useRelojes } from "./use-relojes";

// Hace de reloj inteligente: cada 2 s manda pulso, oxígeno y pasos a /api/vitales.
// Las caídas se mandan como evento (1 al empezar, 0 al terminar).

type Escenario = "normal" | "pulso_alto" | "caida" | "oxigeno_bajo" | "desconectado";

const ESCENARIOS: { id: Escenario; texto: string }[] = [
  { id: "normal", texto: "Normal" },
  { id: "pulso_alto", texto: "Pulso alto" },
  { id: "caida", texto: "Simular caída" },
  { id: "oxigeno_bajo", texto: "Oxígeno bajo" },
  { id: "desconectado", texto: "Reloj desconectado" },
];

const PERIODO_MS = 2000;
const FUENTE = "simulador-reloj";

const entre = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));

export function SimuladorReloj() {
  const [casa, setCasa] = useState<CasaJson | null>(null);
  const [personId, setPersonId] = useState("");
  const [escenario, setEscenario] = useState<Escenario>("normal");
  const [clave, setClave] = useState(0);
  const [reiniciando, setReiniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pasosRef = useRef(0);
  const anteriorRef = useRef<{ personId: string; escenario: Escenario } | null>(null);
  const relojes = useRelojes(2000);

  useEffect(() => {
    api<CasaJson>("/api/casa")
      .then((c) => {
        setCasa(c);
        setPersonId((id) => id || (c.persons.find((p) => p.perfil === "dependiente") ?? c.persons[0])?.id || "");
      })
      .catch((e) => setError(`No se pudo cargar la casa: ${(e as Error).message}`));
  }, []);

  useEffect(() => {
    if (!personId || reiniciando) return;
    const anterior = anteriorRef.current;
    anteriorRef.current = { personId, escenario };
    const ctrl = new AbortController();

    const lectura = (pid: string, metric: Metrica, value: number, unit: string) => ({
      personId: pid,
      source: FUENTE,
      simulated: true,
      metric,
      value,
      unit,
      ts: Date.now(),
    });

    async function enviar(readings: ReturnType<typeof lectura>[]) {
      if (readings.length === 0) return;
      try {
        const res = await fetch("/api/vitales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readings }),
          signal: ctrl.signal,
        });
        setError(res.ok ? null : `El servidor respondió ${res.status}`);
      } catch {
        if (!ctrl.signal.aborted) setError("No se pudieron enviar las lecturas. Reintentando…");
      }
    }

    function ciclo(primero: boolean) {
      const readings: ReturnType<typeof lectura>[] = [];
      if (primero) {
        // La caída es un evento: se avisa cuando empieza y cuando termina.
        if (anterior?.escenario === "caida" && (anterior.personId !== personId || escenario !== "caida")) {
          readings.push(lectura(anterior.personId, "fall", 0, "evento"));
        }
        if (escenario === "caida" && (anterior?.escenario !== "caida" || anterior.personId !== personId)) {
          readings.push(lectura(personId, "fall", 1, "evento"));
        }
      }
      if (escenario !== "desconectado") {
        let pulso = entre(66, 78);
        let oxigeno = entre(95, 98);
        if (escenario === "normal") pasosRef.current += entre(2, 10);
        else if (escenario === "pulso_alto") pulso = entre(125, 140);
        else if (escenario === "caida") pulso = entre(105, 120);
        else if (escenario === "oxigeno_bajo") oxigeno = entre(85, 88);
        readings.push(
          lectura(personId, "heart_rate", pulso, "bpm"),
          lectura(personId, "spo2", oxigeno, "%"),
          lectura(personId, "steps", pasosRef.current, "pasos"),
        );
      }
      void enviar(readings);
    }

    ciclo(true);
    const t = setInterval(() => ciclo(false), PERIODO_MS);
    return () => {
      clearInterval(t);
      ctrl.abort();
    };
  }, [escenario, personId, clave, reiniciando]);

  const reiniciar = useCallback(async () => {
    if (!personId) return;
    setReiniciando(true);
    try {
      await api("/api/vitales/reiniciar", { personId });
    } catch {
      // el próximo ciclo vuelve a mandar datos igual
    }
    pasosRef.current = 0;
    anteriorRef.current = null;
    setEscenario("normal");
    setClave((k) => k + 1);
    setReiniciando(false);
  }, [personId]);

  const persona = casa?.persons.find((p) => p.id === personId);

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 bg-stone-50 px-4 py-6 text-stone-900">
      <header>
        <Link href="/" className="text-sm text-stone-500 hover:underline">
          ← Inicio
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Simulador de reloj</h1>
        <p className="mt-1 text-sm text-stone-600">
          Hace de reloj inteligente: manda lecturas simuladas cada 2 segundos. Dejá esta pantalla abierta durante el demo.
        </p>
      </header>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-stone-600">Lo lleva puesto</span>
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5"
        >
          {casa?.persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.avatar} {p.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      <section className="rounded-2xl border-2 border-dashed border-stone-300 bg-white p-4">
        <h2 className="text-sm font-semibold">Escenario</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ESCENARIOS.map(({ id, texto }) => (
            <button
              key={id}
              type="button"
              aria-pressed={escenario === id}
              disabled={!personId || reiniciando}
              onClick={() => setEscenario(id)}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50",
                escenario === id ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white hover:bg-stone-100",
              )}
            >
              {texto}
            </button>
          ))}
          <button
            type="button"
            onClick={reiniciar}
            disabled={!personId || reiniciando}
            className="min-h-11 rounded-xl border border-stone-900 px-3 py-2 text-sm font-semibold hover:bg-stone-100 disabled:opacity-50"
          >
            {reiniciando ? "Reiniciando…" : "Reiniciar demo"}
          </button>
        </div>
      </section>

      <TarjetaReloj
        estado={relojes?.[personId]}
        titulo={persona ? `Lo que recibe el sistema · ${persona.avatar} ${persona.name}` : "Lo que recibe el sistema"}
      />
    </main>
  );
}
