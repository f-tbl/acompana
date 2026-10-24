import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contacts,
  events,
  fichaLinks,
  homes,
  persons,
  type EstadoEvento,
  type Notificacion,
  type TipoEvento,
} from "@/db/schema";
import { FICHA_LINK_HOURS, HOME_TIMEZONE, HUB_OFFLINE_AFTER_MS } from "@/lib/config";
import { avisosIniciales, estadoInicial, pasoDeEscalamiento } from "@/lib/escalation";
import type { EventoConPersona } from "@/lib/types";
import { calcularPuntaje, NOMBRE_EVENTO, NOMBRE_RESPUESTA, type Respuesta } from "@/lib/score";
import { evaluarRespuesta } from "./evaluate";
import { urlDeSubida, urlsDeClips } from "./supabase";

export const ESTADOS_ACTIVOS: EstadoEvento[] = ["alerta", "atendiendo", "ambulancia", "emergencias", "pendiente"];

export function horaLocal(d = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: HOME_TIMEZONE }).format(d),
  );
}

export async function casaActual() {
  const [home] = await db.select().from(homes).limit(1);
  if (!home) throw new Error("No hay ninguna casa cargada: correr `npm run db:seed`");
  return home;
}

export async function datosCasa() {
  const home = await casaActual();
  const [ps, cs] = await Promise.all([
    db.select().from(persons).where(eq(persons.homeId, home.id)).orderBy(desc(persons.age)),
    db.select().from(contacts).where(eq(contacts.homeId, home.id)).orderBy(asc(contacts.priority)),
  ]);
  const hubOnline = !!home.hubLastSeen && Date.now() - home.hubLastSeen.getTime() < HUB_OFFLINE_AFTER_MS;
  return { home, persons: ps, contacts: cs, hubOnline };
}

async function crearLinkFicha(personId: string, eventId: string) {
  const token = randomBytes(18).toString("base64url");
  await db.insert(fichaLinks).values({
    token,
    personId,
    eventId,
    expiresAt: new Date(Date.now() + FICHA_LINK_HOURS * 3600_000),
  });
  return token;
}

const agregarAvisos = (nuevos: Notificacion[]) =>
  sql`${events.notifications} || ${JSON.stringify(nuevos)}::jsonb`;

export async function crearIncidente(args: {
  personId: string;
  tipo: TipoEvento;
  room: string;
  texto: string | null;
  /** Si ya se sabe la respuesta (ej. «ayuda» en modo conversación), no se evalúa de nuevo. */
  respuesta?: Respuesta;
  resumen?: string;
  clipExt?: string;
}) {
  const persona = await db.query.persons.findFirst({ where: eq(persons.id, args.personId) });
  if (!persona) throw new Error("Persona inexistente");
  const contactos = await db.select().from(contacts).where(eq(contacts.homeId, persona.homeId));

  const { clasificacion, evaluacion } = args.respuesta
    ? {
        clasificacion: args.respuesta,
        evaluacion: { clasificacion: args.respuesta, motivo: NOMBRE_RESPUESTA[args.respuesta], fuente: "reglas" as const },
      }
    : await evaluarRespuesta({ persona, tipo: args.tipo, texto: args.texto });

  const now = new Date();
  const { score, nivel, factores } = calcularPuntaje({
    tipo: args.tipo,
    respuesta: clasificacion,
    hora: horaLocal(now),
    contexto: persona.context,
  });

  const resumen =
    args.resumen ??
    `${NOMBRE_EVENTO[args.tipo]} en ${args.room.toLowerCase()} · ${persona.name}: ${NOMBRE_RESPUESTA[clasificacion].toLowerCase()}`;

  const [event] = await db
    .insert(events)
    .values({
      homeId: persona.homeId,
      personId: persona.id,
      type: args.tipo,
      room: args.room,
      status: estadoInicial(args.tipo, nivel),
      score,
      level: nivel,
      responseText: args.texto,
      summary: resumen,
      assessment: evaluacion,
      scoreBreakdown: factores,
      notifications: avisosIniciales(nivel, contactos, resumen, now),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Privacidad: solo se sube video cuando hay alerta (nivel ≥ 2).
  const upload =
    nivel >= 2 && args.tipo !== "pedido" && args.clipExt
      ? await urlDeSubida(`${event.id}.${args.clipExt}`)
      : null;

  return { event, upload };
}

export async function guardarClip(eventId: string, path: string) {
  if (!path.startsWith(eventId)) throw new Error("Ruta de clip inválida");
  await db.update(events).set({ clipPath: path, updatedAt: new Date() }).where(eq(events.id, eventId));
}

export type Accion = "cancelar" | "atender" | "ambulancia" | "resolver" | "atendido";

const TRANSICIONES: Record<Accion, { desde: EstadoEvento[]; hacia: EstadoEvento; mensaje: string }> = {
  cancelar: { desde: ["alerta", "atendiendo"], hacia: "cancelada", mensaje: "El cuidador lo marcó como falsa alarma" },
  atender: { desde: ["alerta"], hacia: "atendiendo", mensaje: "El cuidador tomó el caso; se frena el escalamiento" },
  ambulancia: {
    desde: ["alerta", "atendiendo"],
    hacia: "ambulancia",
    mensaje: "Ambulancia solicitada con ubicación y ficha médica (simulada)",
  },
  resolver: { desde: ["alerta", "atendiendo", "ambulancia", "emergencias"], hacia: "resuelta", mensaje: "Incidente resuelto" },
  atendido: { desde: ["pendiente"], hacia: "atendido", mensaje: "Pedido atendido" },
};

export async function aplicarAccion(eventId: string, accion: Accion) {
  const t = TRANSICIONES[accion];
  const now = new Date();
  const [event] = await db
    .update(events)
    .set({
      status: t.hacia,
      updatedAt: now,
      resolvedAt: ["cancelada", "resuelta", "atendido"].includes(t.hacia) ? now : undefined,
      notifications: agregarAvisos([
        { at: now.toISOString(), contacto: "Sistema", rol: "sistema", canal: "app", mensaje: t.mensaje },
      ]),
    })
    .where(and(eq(events.id, eventId), inArray(events.status, t.desde)))
    .returning();
  if (!event) return null;

  if (accion === "ambulancia") {
    const fichaToken = await crearLinkFicha(event.personId, event.id);
    await db.update(events).set({ fichaToken }).where(eq(events.id, event.id));
    return { ...event, fichaToken };
  }
  return event;
}

/** Idempotente: lo llaman periódicamente el hub y la app del cuidador. */
export async function escalarPendientes() {
  const abiertos = await db.select().from(events).where(eq(events.status, "alerta"));
  if (abiertos.length === 0) return 0;
  const contactos = await db.select().from(contacts);
  const now = new Date();
  let cambios = 0;

  for (const e of abiertos) {
    const paso = pasoDeEscalamiento(e, contactos.filter((c) => c.homeId === e.homeId), now);
    if (!paso) continue;
    // El filtro por escalation_step evita escalar dos veces si dos clientes llaman a la vez.
    const [actualizado] = await db
      .update(events)
      .set({
        status: paso.status,
        escalationStep: 1,
        updatedAt: now,
        notifications: agregarAvisos(paso.notifications),
      })
      .where(and(eq(events.id, e.id), eq(events.escalationStep, 0), eq(events.status, "alerta")))
      .returning();
    if (!actualizado) continue;
    cambios++;
    if (paso.status === "emergencias") {
      const fichaToken = await crearLinkFicha(e.personId, e.id);
      await db.update(events).set({ fichaToken }).where(eq(events.id, e.id));
    }
  }
  return cambios;
}

export async function listarEventos(opts: { limit?: number; soloActivos?: boolean } = {}) {
  const rows = await db
    .select({ event: events, personName: persons.name, personAvatar: persons.avatar })
    .from(events)
    .innerJoin(persons, eq(events.personId, persons.id))
    .where(opts.soloActivos ? inArray(events.status, ESTADOS_ACTIVOS) : undefined)
    .orderBy(desc(events.createdAt))
    .limit(opts.limit ?? 30);

  const clips = await urlsDeClips(rows.flatMap((r) => (r.event.clipPath ? [r.event.clipPath] : [])));
  return rows.map<EventoConPersona>((r) => ({
    ...r.event,
    personName: r.personName,
    personAvatar: r.personAvatar,
    clipUrl: r.event.clipPath ? (clips.get(r.event.clipPath) ?? null) : null,
  }));
}

export async function latidoHub() {
  const home = await casaActual();
  await db.update(homes).set({ hubLastSeen: new Date() }).where(eq(homes.id, home.id));
}

export async function fichaPorToken(token: string) {
  const link = await db.query.fichaLinks.findFirst({ where: eq(fichaLinks.token, token) });
  if (!link || link.revoked || link.expiresAt < new Date()) return null;
  const persona = await db.query.persons.findFirst({ where: eq(persons.id, link.personId) });
  if (!persona) return null;
  const [home, contactos, evento] = await Promise.all([
    db.query.homes.findFirst({ where: eq(homes.id, persona.homeId) }),
    db.select().from(contacts).where(eq(contacts.homeId, persona.homeId)).orderBy(asc(contacts.priority)),
    link.eventId ? db.query.events.findFirst({ where: eq(events.id, link.eventId) }) : undefined,
  ]);
  return { link, persona, home: home!, contactos, evento: evento ?? null };
}
