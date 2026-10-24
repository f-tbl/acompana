import type { Metrica } from "@/db/schema";

// Estado del reloj a partir de sus lecturas. Lógica pura: la usan el servidor, la casa y el cuidador.

/** Sin lecturas durante este tiempo, el reloj se considera desconectado. */
export const RELOJ_SIN_DATOS_MS = 10_000;
/** Ventana de lecturas que se consulta para armar el estado. */
export const VENTANA_LECTURAS_MS = 3 * 60_000;
const MAX_SERIE = 60;

export type LecturaVital = {
  metric: Metrica;
  value: number;
  ts: number; // hora del dispositivo (ms)
  recibida: number; // hora del servidor (ms)
  simulated: boolean;
};

export type TipoAlertaReloj =
  | "caida"
  | "sin_datos"
  | "pulso_alto"
  | "pulso_elevado"
  | "pulso_bajo"
  | "oxigeno_bajo"
  | "oxigeno_ajustado";

export type AlertaReloj = { tipo: TipoAlertaReloj; severidad: "alta" | "critica"; mensaje: string; ts: number };

export type EstadoReloj = {
  conectado: boolean;
  simulado: boolean;
  pulso: number | null;
  spo2: number | null;
  pasos: number | null;
  serie: { ts: number; bpm: number }[];
  alertas: AlertaReloj[];
  ultimoDato: number | null; // hora del servidor de la última lectura (sin contar caídas)
};

export type Signos = { pulso: number | null; spo2: number | null };

/** Pulso y oxígeno fuera de rango, de lo más grave a lo menos grave. */
export function evaluarSignos({ pulso, spo2 }: Signos): Omit<AlertaReloj, "ts">[] {
  const out: Omit<AlertaReloj, "ts">[] = [];
  if (pulso !== null) {
    if (pulso > 120) out.push({ tipo: "pulso_alto", severidad: "critica", mensaje: `Pulso muy alto: ${pulso} lpm` });
    else if (pulso > 100) out.push({ tipo: "pulso_elevado", severidad: "alta", mensaje: `Pulso elevado: ${pulso} lpm` });
    else if (pulso < 45) out.push({ tipo: "pulso_bajo", severidad: "alta", mensaje: `Pulso bajo: ${pulso} lpm` });
  }
  if (spo2 !== null) {
    if (spo2 < 90) out.push({ tipo: "oxigeno_bajo", severidad: "critica", mensaje: `Oxígeno bajo: ${spo2}%` });
    else if (spo2 < 94) out.push({ tipo: "oxigeno_ajustado", severidad: "alta", mensaje: `Oxígeno algo bajo: ${spo2}%` });
  }
  return out.sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === "critica" ? -1 : 1));
}

function hace(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.round(s / 60)} min`;
}

export function estadoReloj(lecturas: LecturaVital[], ahora = Date.now()): EstadoReloj {
  const ordenadas = [...lecturas].sort((a, b) => a.ts - b.ts);
  const ultima: Partial<Record<Metrica, LecturaVital>> = {};
  for (const l of ordenadas) ultima[l.metric] = l;

  const datos = ordenadas.filter((l) => l.metric !== "fall");
  const ultimoDato = datos.length ? Math.max(...datos.map((l) => l.recibida)) : null;
  const conectado = ultimoDato !== null && ahora - ultimoDato < RELOJ_SIN_DATOS_MS;

  const pulso = conectado ? (ultima.heart_rate?.value ?? null) : null;
  const spo2 = conectado ? (ultima.spo2?.value ?? null) : null;
  const alertas: AlertaReloj[] = [];

  if (ultima.fall?.value === 1) {
    alertas.push({ tipo: "caida", severidad: "critica", mensaje: "El reloj detectó una posible caída", ts: ultima.fall.ts });
  }
  if (ultimoDato !== null && !conectado) {
    alertas.push({
      tipo: "sin_datos",
      severidad: "alta",
      mensaje: `No llegan datos del reloj hace ${hace(ahora - ultimoDato)}`,
      ts: ultimoDato,
    });
  }
  if (conectado) {
    for (const a of evaluarSignos({ pulso, spo2 })) alertas.push({ ...a, ts: ultimoDato });
  }

  return {
    conectado,
    simulado: datos.at(-1)?.simulated ?? false,
    pulso,
    spo2,
    pasos: ultima.steps?.value ?? null,
    serie: ordenadas
      .filter((l) => l.metric === "heart_rate")
      .slice(-MAX_SERIE)
      .map((l) => ({ ts: l.ts, bpm: l.value })),
    alertas: alertas.sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === "critica" ? -1 : 1)),
    ultimoDato,
  };
}
