import type { Contact, EstadoEvento, Event, Notificacion, TipoEvento } from "@/db/schema";
import { COUNTDOWN_SECONDS, ESCALATION_SECONDS } from "./config";
import type { Nivel } from "./score";

export const NUMERO_EMERGENCIAS = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER ?? "911";

function porRol(contacts: Contact[], rol: Contact["role"]) {
  return contacts.filter((c) => c.role === rol).sort((a, b) => a.priority - b.priority);
}

function aviso(
  c: Contact,
  canal: Notificacion["canal"],
  mensaje: string,
  at: Date,
): Notificacion {
  return { at: at.toISOString(), contacto: `${c.name} (${c.relation})`, rol: c.role, canal, mensaje };
}

export function estadoInicial(tipo: TipoEvento, nivel: Nivel): EstadoEvento {
  if (tipo === "pedido") return "pendiente";
  return nivel === 1 ? "registrado" : "alerta";
}

export function avisosIniciales(
  nivel: Nivel,
  contacts: Contact[],
  resumen: string,
  at: Date,
): Notificacion[] {
  const principal = porRol(contacts, "principal");
  if (nivel === 1) return principal.map((c) => aviso(c, "app", `Registro: ${resumen}`, at));
  if (nivel === 2) return principal.map((c) => aviso(c, "app", `Alerta con video: ${resumen}`, at));
  if (nivel === 3) {
    return [
      ...principal.map((c) => aviso(c, "app", `Alerta grave con video: ${resumen}`, at)),
      ...porRol(contacts, "vecino").map((c) => aviso(c, "sms", `Por favor acercate: ${resumen}`, at)),
      ...porRol(contacts, "teleasistencia").map((c) =>
        aviso(c, "llamada", `Aviso de incidente: ${resumen}`, at),
      ),
    ];
  }
  return principal.map((c) =>
    aviso(
      c,
      "app",
      `ALERTA CRÍTICA: ${resumen}. Se llama a emergencias en ${COUNTDOWN_SECONDS} s si no cancelás.`,
      at,
    ),
  );
}

/** Momento en que el evento escala solo si nadie lo atiende (null si no escala más). */
export function proximoEscalamiento(e: Pick<Event, "status" | "level" | "escalationStep" | "createdAt">) {
  if (e.status !== "alerta" || e.escalationStep > 0) return null;
  const base = new Date(e.createdAt).getTime();
  if (e.level === 2 || e.level === 3) return new Date(base + ESCALATION_SECONDS * 1000);
  if (e.level === 4) return new Date(base + COUNTDOWN_SECONDS * 1000);
  return null;
}

export function avisoEmergencias(at: Date): Notificacion {
  return {
    at: at.toISOString(),
    contacto: `Emergencias ${NUMERO_EMERGENCIAS}`,
    rol: "emergencias",
    canal: "llamada",
    mensaje: "Llamada automática con ubicación, ficha médica y último registro (simulada)",
  };
}

/** Siguiente paso de escalamiento si ya venció el plazo; null si no corresponde nada. */
export function pasoDeEscalamiento(e: Event, contacts: Contact[], now: Date) {
  const vence = proximoEscalamiento(e);
  if (!vence || now < vence) return null;

  if (e.level === 2) {
    const secundarios = porRol(contacts, "secundario");
    return {
      status: "alerta" as const,
      notifications: secundarios.map((c) =>
        aviso(c, "app", `El cuidador principal no respondió: ${e.summary ?? "incidente"}`, now),
      ),
    };
  }
  return { status: "emergencias" as const, notifications: [avisoEmergencias(now)] };
}
