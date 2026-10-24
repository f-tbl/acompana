import { HeartPulse, Watch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EstadoReloj } from "@/lib/vitales";
import { GraficoPulso } from "./grafico-pulso";

/** Pulso, oxígeno, pasos, gráfico y alertas del reloj de una persona. */
export function TarjetaReloj({ estado, titulo }: { estado: EstadoReloj | undefined; titulo: React.ReactNode }) {
  const critica = estado?.alertas.some((a) => a.severidad === "critica");
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white",
        critica ? "border-rose-300" : estado?.alertas.length ? "border-amber-300" : "border-stone-200",
      )}
    >
      <header className="flex items-center gap-2 border-b border-stone-100 px-4 py-2.5 text-sm">
        <Watch className="size-4 text-stone-500" />
        <span className="min-w-0 flex-1 truncate font-semibold">{titulo}</span>
        {estado?.simulado && (
          <span className="rounded border border-stone-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">SIMULADO</span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
            estado?.conectado ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500",
          )}
        >
          <span className={cn("size-1.5 rounded-full", estado?.conectado ? "bg-emerald-500" : "bg-stone-400")} />
          {estado?.conectado ? "Conectado" : "Sin datos"}
        </span>
      </header>

      <div className="space-y-3 p-4">
        <dl className="grid grid-cols-3 gap-2">
          <Dato titulo="Pulso" valor={estado?.pulso} unidad="lpm" icono />
          <Dato titulo="Oxígeno" valor={estado?.spo2} unidad="%" />
          <Dato titulo="Pasos" valor={estado?.pasos} unidad="hoy" />
        </dl>

        <GraficoPulso serie={estado?.serie ?? []} />

        {estado && estado.alertas.length > 0 && (
          <ul className="space-y-1.5">
            {estado.alertas.map((a) => (
              <li
                key={a.tipo}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  a.severidad === "critica" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900",
                )}
              >
                {a.mensaje}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Dato({ titulo, valor, unidad, icono }: { titulo: string; valor: number | null | undefined; unidad: string; icono?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-stone-100 p-2.5">
      <dt className="flex items-center gap-1 text-xs font-semibold text-stone-500">
        {icono && <HeartPulse className="size-3.5 text-rose-600" />}
        {titulo}
      </dt>
      <dd>
        <span className="text-2xl font-bold tabular-nums">{valor != null ? valor.toLocaleString("es-AR") : "—"}</span>
        <span className="ml-1 text-xs text-stone-500">{unidad}</span>
      </dd>
    </div>
  );
}
