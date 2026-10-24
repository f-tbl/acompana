"use client";

import { Ambulance, BellRing, Check, CircleCheck, Hand, History, Siren, Volume2, Wifi, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { proximoEscalamiento } from "@/lib/escalation";
import { api, avisarCambio, useEnVivo } from "@/lib/live";
import { NIVELES, NOMBRE_EVENTO, type Nivel } from "@/lib/score";
import type { CasaJson, EventoJson, EventosJson } from "@/lib/types";
import { cn, haceCuanto, horaCorta } from "@/lib/utils";

type Accion = "cancelar" | "atender" | "ambulancia" | "resolver" | "atendido";

export function AppCuidador() {
  const [casa, setCasa] = useState<CasaJson | null>(null);
  const [datos, setDatos] = useState<EventosJson | null>(null);
  const [sonido, setSonido] = useState(false);
  const [ahora, setAhora] = useState(0); // se fija en el efecto: Date.now() no puede correr en el prerender
  const [enviando, setEnviando] = useState<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const vistosRef = useRef<Set<string> | null>(null);

  const refrescar = useCallback(async () => {
    try {
      const { cambios } = await api<{ cambios: number }>("/api/escalar", {});
      if (cambios) avisarCambio();
      const [c, d] = await Promise.all([api<CasaJson>("/api/casa"), api<EventosJson>("/api/eventos")]);
      setCasa(c);
      setDatos(d);
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEnVivo(refrescar);

  useEffect(() => {
    const tick = () => setAhora(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Suena y vibra cuando entra una alerta o un pedido nuevo.
  useEffect(() => {
    if (!datos) return;
    const ids = new Set(datos.activos.map((e) => e.id));
    const anteriores = vistosRef.current;
    vistosRef.current = ids;
    if (!anteriores) return;
    const nuevos = datos.activos.filter((e) => !anteriores.has(e.id));
    if (nuevos.length === 0) return;
    const grave = nuevos.some((e) => e.level >= 3);
    navigator.vibrate?.(grave ? [400, 150, 400, 150, 400] : [200]);
    if (audioRef.current) pitido(audioRef.current, grave ? 3 : 1);
  }, [datos]);

  async function accion(e: EventoJson, a: Accion) {
    setEnviando(e.id + a);
    try {
      await api(`/api/eventos/${e.id}/accion`, { accion: a });
      avisarCambio();
      await refrescar();
    } finally {
      setEnviando(null);
    }
  }

  function activarSonido() {
    audioRef.current ??= new AudioContext();
    void audioRef.current.resume();
    pitido(audioRef.current, 1);
    setSonido(true);
  }

  const alertas = datos?.activos.filter((e) => e.type !== "pedido") ?? [];
  const pedidos = datos?.activos.filter((e) => e.status === "pendiente") ?? [];
  const historial = datos?.recientes.filter((e) => !datos.activos.some((a) => a.id === e.id)).slice(0, 8) ?? [];

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-stone-50 pb-10 text-stone-900">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-200 bg-stone-50/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold leading-tight">{casa?.home.name ?? "Guardián"}</h1>
          <p className="flex items-center gap-1 text-xs text-stone-500">
            {casa?.hubOnline ? (
              <>
                <Wifi className="size-3 text-emerald-600" /> Casa conectada
              </>
            ) : (
              <>
                <WifiOff className="size-3 text-rose-600" /> Equipo de la casa sin conexión
              </>
            )}
            {casa && <span className="ml-1">· {casa.persons.map((p) => `${p.avatar} ${p.name}`).join("  ")}</span>}
          </p>
        </div>
        <Link href="/historial" className="rounded-lg p-2 text-stone-600 hover:bg-stone-200" aria-label="Historial">
          <History className="size-5" />
        </Link>
      </header>

      {!sonido && (
        <button
          onClick={activarSonido}
          className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900"
        >
          <Volume2 className="size-4 shrink-0" /> Tocá acá para activar el sonido de las alertas
        </button>
      )}

      {casa && !casa.hubOnline && (
        <p className="mx-4 mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Falla técnica: el equipo de la casa no reporta hace más de 45 s (luz, internet o el dispositivo apagado).
        </p>
      )}

      <section className="space-y-4 px-4 pt-4">
        {alertas.length === 0 && pedidos.length === 0 && datos && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
            <CircleCheck className="mx-auto size-8 text-emerald-600" />
            <p className="mt-2 font-medium">Todo tranquilo</p>
            <p className="text-sm text-stone-500">No hay alertas ni pedidos pendientes.</p>
          </div>
        )}

        {alertas.map((e) => (
          <TarjetaAlerta key={e.id} e={e} ahora={ahora} enviando={enviando} onAccion={accion} />
        ))}

        {pedidos.map((e) => (
          <div key={e.id} className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <span className="text-2xl">{e.personAvatar}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Pedido · {haceCuanto(e.createdAt, ahora)}</p>
              <p className="font-semibold">{e.summary}</p>
              {e.responseText && <p className="text-sm text-stone-600">Dijo: «{e.responseText}»</p>}
            </div>
            <button
              onClick={() => accion(e, "atendido")}
              disabled={!!enviando}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Check className="size-4" /> Voy
            </button>
          </div>
        ))}
      </section>

      {historial.length > 0 && (
        <section className="px-4 pt-6">
          <h2 className="mb-2 text-sm font-semibold text-stone-500">Últimos registros</h2>
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {historial.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span>{e.personAvatar}</span>
                <span className="min-w-0 flex-1 truncate">{e.summary}</span>
                <EstadoChip e={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function TarjetaAlerta({
  e,
  ahora,
  enviando,
  onAccion,
}: {
  e: EventoJson;
  ahora: number;
  enviando: string | null;
  onAccion: (e: EventoJson, a: Accion) => void;
}) {
  const nivel = e.level as Nivel;
  const vence = proximoEscalamiento({ ...e, createdAt: new Date(e.createdAt) });
  const restante = vence ? Math.max(0, Math.ceil((vence.getTime() - ahora) / 1000)) : null;
  const abierta = e.status === "alerta" || e.status === "atendiendo";
  const enCamino = e.status === "ambulancia" || e.status === "emergencias";
  const fichaUrl = e.fichaToken && typeof window !== "undefined" ? `${window.location.origin}/ficha/${e.fichaToken}` : null;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        nivel === 4 ? "border-rose-400" : nivel === 3 ? "border-orange-300" : "border-amber-300",
        e.status === "alerta" && nivel >= 3 && "ring-4 ring-rose-200",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white",
          nivel === 4 ? "bg-rose-600" : nivel === 3 ? "bg-orange-500" : "bg-amber-500",
        )}
      >
        {nivel >= 3 ? <Siren className="size-4" /> : <BellRing className="size-4" />}
        <span className="flex-1">
          {NOMBRE_EVENTO[e.type]} · {e.room}
        </span>
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs">
          {e.score}/10 · {NIVELES[nivel].titulo}
        </span>
      </div>

      {e.clipUrl ? (
        <video src={e.clipUrl} controls autoPlay muted playsInline className="aspect-video w-full bg-black" />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-stone-100 text-sm text-stone-500">
          {e.type === "pedido_ayuda" ? "Pedido por voz: sin video" : "Recibiendo el video del momento…"}
        </div>
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{e.personAvatar}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {e.personName} · {haceCuanto(e.createdAt, ahora)}
            </p>
            <p className="text-sm text-stone-600">
              {e.responseText ? <>Respondió: «{e.responseText}»</> : "No respondió a la pregunta por voz"}
            </p>
            {e.assessment?.motivo && (
              <p className="text-xs text-stone-500">
                Evaluación ({e.assessment.fuente === "claude" ? "IA" : "reglas"}): {e.assessment.motivo}
              </p>
            )}
          </div>
        </div>

        {e.status === "alerta" && restante !== null && (
          <div
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium",
              nivel === 4 ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900",
            )}
          >
            {nivel === 2
              ? `Si no respondés, se avisa al contacto secundario en ${restante} s`
              : `Si nadie responde, se llama a emergencias en ${restante} s`}
          </div>
        )}
        {e.status === "atendiendo" && (
          <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">Te estás ocupando: el escalamiento está frenado.</p>
        )}

        {enCamino && (
          <div className="space-y-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
            <p className="flex items-center gap-2 font-semibold">
              <Ambulance className="size-4" />
              {e.status === "ambulancia" ? "Ambulancia solicitada (simulada)" : "El sistema llamó a emergencias (simulado)"}
            </p>
            <p>Se enviaron la ubicación, la ficha médica y el último registro.</p>
            {fichaUrl && (
              <div className="flex items-center gap-3">
                <QRCodeSVG value={fichaUrl} size={84} className="shrink-0 rounded bg-white p-1" />
                <a href={fichaUrl} target="_blank" className="break-all font-medium underline">
                  Ver ficha enviada
                </a>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {abierta && (
            <button
              onClick={() => onAccion(e, "ambulancia")}
              disabled={!!enviando}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              <Ambulance className="size-5" /> Pedir ambulancia
            </button>
          )}
          {abierta && (
            <button
              onClick={() => onAccion(e, "cancelar")}
              disabled={!!enviando}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              <X className="size-4" /> Falsa alarma
            </button>
          )}
          {e.status === "alerta" && (
            <button
              onClick={() => onAccion(e, "atender")}
              disabled={!!enviando}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              <Hand className="size-4" /> Me ocupo
            </button>
          )}
          {(e.status === "atendiendo" || enCamino) && (
            <button
              onClick={() => onAccion(e, "resolver")}
              disabled={!!enviando}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-medium disabled:opacity-50",
                enCamino && "col-span-2",
              )}
            >
              <Check className="size-4" /> Resuelto
            </button>
          )}
        </div>

        <details className="text-xs text-stone-500">
          <summary className="cursor-pointer select-none">Detalle del puntaje y avisos</summary>
          <ul className="mt-2 space-y-0.5">
            {e.scoreBreakdown.map((f, i) => (
              <li key={i} className="flex justify-between">
                <span>{f.factor}</span>
                <span className="font-mono">{f.puntos > 0 ? `+${f.puntos}` : f.puntos}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-2 space-y-1 border-t border-stone-200 pt-2">
            {e.notifications.map((n, i) => (
              <li key={i}>
                <span className="font-mono">{horaCorta(n.at)}</span> · {n.contacto} ({n.canal}): {n.mensaje}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}

const ESTADO: Record<string, { label: string; clase: string }> = {
  registrado: { label: "Registrado", clase: "bg-stone-100 text-stone-600" },
  cancelada: { label: "Falsa alarma", clase: "bg-stone-100 text-stone-600" },
  resuelta: { label: "Resuelto", clase: "bg-emerald-50 text-emerald-700" },
  atendido: { label: "Atendido", clase: "bg-emerald-50 text-emerald-700" },
  alerta: { label: "Alerta", clase: "bg-amber-50 text-amber-800" },
  atendiendo: { label: "Atendiendo", clase: "bg-sky-50 text-sky-700" },
  ambulancia: { label: "Ambulancia", clase: "bg-rose-50 text-rose-700" },
  emergencias: { label: "Emergencias", clase: "bg-rose-50 text-rose-700" },
  pendiente: { label: "Pendiente", clase: "bg-sky-50 text-sky-700" },
};

export function EstadoChip({ e }: { e: Pick<EventoJson, "status"> }) {
  const s = ESTADO[e.status];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", s.clase)}>{s.label}</span>;
}

function pitido(ctx: AudioContext, veces: number) {
  for (let i = 0; i < veces; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.45 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.45 + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.45);
    osc.stop(ctx.currentTime + i * 0.45 + 0.4);
  }
}
