import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { EstadoChip } from "@/components/cuidador/app-cuidador";
import { NOMBRE_EVENTO } from "@/lib/score";
import { diaCasa, fechaCasa } from "@/lib/utils";
import { listarEventos } from "@/server/events";

export const metadata: Metadata = { title: "Historial · Acompañar" };

export default function HistorialPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-stone-50" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const eventos = await listarEventos({ limit: 200 });

  const hoy = diaCasa(new Date());
  const deHoy = eventos.filter((e) => diaCasa(e.createdAt) === hoy);
  const resumen = [
    { label: "Eventos hoy", valor: deHoy.length },
    { label: "Alertas", valor: deHoy.filter((e) => e.level >= 2 && e.type !== "pedido").length },
    { label: "Falsas alarmas", valor: deHoy.filter((e) => e.status === "cancelada").length },
    { label: "Pedidos", valor: deHoy.filter((e) => e.type === "pedido").length },
  ];

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <Link href="/cuidador" className="text-sm text-stone-500 hover:underline">
            ← App del cuidador
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Historial</h1>
          <p className="text-sm text-stone-500">Solo se guardan eventos: el video no se almacena salvo el clip de cada alerta.</p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {resumen.map((r) => (
            <div key={r.label} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-2xl font-semibold tabular-nums">{r.valor}</p>
              <p className="text-xs text-stone-500">{r.label}</p>
            </div>
          ))}
        </div>

        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {eventos.length === 0 && <li className="p-6 text-center text-sm text-stone-500">Todavía no hay eventos.</li>}
          {eventos.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-3">
              <span className="text-xl">{e.personAvatar}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {NOMBRE_EVENTO[e.type]} · {e.room}
                  <span className="ml-2 font-mono text-xs text-stone-500">{e.score}/10</span>
                </p>
                <p className="text-sm text-stone-600">{e.summary}</p>
                {e.responseText && <p className="text-xs text-stone-500">«{e.responseText}»</p>}
                <p className="text-xs text-stone-400">{fechaCasa(e.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <EstadoChip e={e} />
                {e.clipUrl && (
                  <a href={e.clipUrl} target="_blank" className="text-xs text-stone-500 underline">
                    Ver clip
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
