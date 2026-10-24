import type { ContextoDiario, FactorPuntaje, TipoEvento } from "@/db/schema";

export type Respuesta =
  | "bien" // responde con coherencia que está bien
  | "pide_ayuda"
  | "dolor"
  | "confusa"
  | "sin_respuesta"
  | "no_aplica"; // pedidos del modo conversación

export type Nivel = 1 | 2 | 3 | 4;

const BASE: Record<TipoEvento, number> = {
  caida: 6,
  descenso_brusco: 4,
  inmovilidad: 5,
  salida: 4,
  grito: 5,
  pedido_ayuda: 5,
  boton_panico: 7,
  pedido: 1,
};

const AJUSTE_RESPUESTA: Record<Respuesta, number> = {
  bien: -4,
  pide_ayuda: 0,
  dolor: 2,
  confusa: 2,
  sin_respuesta: 4,
  no_aplica: 0,
};

/**
 * Eventos que detectan solos la cámara o el micrófono: se pausan tras una falsa alarma.
 * El botón de pánico y los pedidos por voz nunca se pausan.
 */
export const DETECCIONES_AUTOMATICAS: TipoEvento[] = ["caida", "descenso_brusco", "inmovilidad", "salida", "grito"];

export const NOMBRE_EVENTO: Record<TipoEvento, string> = {
  caida: "Caída detectada",
  descenso_brusco: "Movimiento brusco",
  inmovilidad: "Inmovilidad prolongada",
  salida: "Salida de la casa",
  grito: "Grito detectado",
  pedido_ayuda: "Pedido de ayuda por voz",
  boton_panico: "Botón de pánico",
  pedido: "Pedido",
};

export const NOMBRE_RESPUESTA: Record<Respuesta, string> = {
  bien: "Respondió con coherencia que está bien",
  pide_ayuda: "Pide ayuda",
  dolor: "Dice que se lastimó o le duele algo",
  confusa: "Respuesta confusa",
  sin_respuesta: "No respondió",
  no_aplica: "—",
};

export const NIVELES: Record<Nivel, { rango: string; titulo: string; accion: string }> = {
  1: {
    rango: "1–3",
    titulo: "Leve",
    accion: "Registro en el historial + notificación en la app",
  },
  2: {
    rango: "4–6",
    titulo: "Moderado",
    accion: "Alerta al cuidador principal con video; si no responde, al secundario",
  },
  3: {
    rango: "7–8",
    titulo: "Grave",
    accion: "Alerta + vecino y teleasistencia; si nadie responde, emergencias",
  },
  4: {
    rango: "9–10",
    titulo: "Crítico",
    accion: "Alerta inmediata con cuenta regresiva; luego emergencias automáticamente",
  },
};

export function esDeNoche(hora: number) {
  return hora >= 22 || hora < 7;
}

export function nivelDe(score: number): Nivel {
  if (score >= 9) return 4;
  if (score >= 7) return 3;
  if (score >= 4) return 2;
  return 1;
}

export function calcularPuntaje(input: {
  tipo: TipoEvento;
  respuesta: Respuesta;
  hora: number; // hora local de la casa, 0–23
  contexto?: ContextoDiario;
}) {
  const { tipo, respuesta, hora, contexto } = input;
  const factores: FactorPuntaje[] = [{ factor: NOMBRE_EVENTO[tipo], puntos: BASE[tipo] }];

  if (respuesta !== "no_aplica") {
    factores.push({ factor: NOMBRE_RESPUESTA[respuesta], puntos: AJUSTE_RESPUESTA[respuesta] });
  }

  if (tipo !== "pedido") {
    if (esDeNoche(hora)) {
      factores.push({ factor: "Ocurre de noche", puntos: tipo === "salida" ? 3 : 1 });
    }
    if (contexto && !contexto.medicacionTomada) {
      factores.push({ factor: "No tomó la medicación", puntos: 1 });
    }
    if (contexto?.durmioMal) {
      factores.push({ factor: "Durmió mal los días previos", puntos: 1 });
    }
  }

  let score = factores.reduce((acc, f) => acc + f.puntos, 0);
  // Un pedido de ayuda explícito nunca queda en "solo registro".
  if (respuesta === "pide_ayuda") score = Math.max(score, 4);
  score = Math.min(10, Math.max(1, score));

  return { score, nivel: nivelDe(score), factores };
}
