import "server-only";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { homes, lecturas, persons, type Metrica } from "@/db/schema";
import { estadoReloj, VENTANA_LECTURAS_MS, type EstadoReloj, type Signos } from "@/lib/vitales";

export type LecturaEntrante = {
  personId: string;
  metric: Metrica;
  value: number;
  unit: string;
  source: string;
  simulated: boolean;
  ts: number;
};

/** Guarda las lecturas de personas que existen. Devuelve cuántas se guardaron. */
export async function guardarLecturas(entrantes: LecturaEntrante[]) {
  const ids = [...new Set(entrantes.map((l) => l.personId))];
  const existentes = await db.select({ id: persons.id }).from(persons).where(inArray(persons.id, ids));
  const validos = new Set(existentes.map((p) => p.id));
  const filas = entrantes
    .filter((l) => validos.has(l.personId))
    .map((l) => ({ ...l, ts: new Date(l.ts) }));
  if (filas.length) await db.insert(lecturas).values(filas);
  return filas.length;
}

async function lecturasRecientes(personIds: string[]) {
  if (personIds.length === 0) return [];
  return db
    .select()
    .from(lecturas)
    .where(
      and(
        inArray(lecturas.personId, personIds),
        gt(lecturas.receivedAt, new Date(Date.now() - VENTANA_LECTURAS_MS)),
      ),
    );
}

/** Estado del reloj de cada persona de la casa (solo las que mandaron datos hace poco). */
export async function estadoRelojes(): Promise<Record<string, EstadoReloj>> {
  const [home] = await db.select({ id: homes.id }).from(homes).limit(1);
  if (!home) return {};
  const ps = await db.select({ id: persons.id }).from(persons).where(eq(persons.homeId, home.id));
  const filas = await lecturasRecientes(ps.map((p) => p.id));
  const ahora = Date.now();
  const out: Record<string, EstadoReloj> = {};
  for (const p of ps) {
    const propias = filas.filter((f) => f.personId === p.id);
    if (propias.length === 0) continue;
    out[p.id] = estadoReloj(
      propias.map((f) => ({
        metric: f.metric,
        value: f.value,
        ts: f.ts.getTime(),
        recibida: f.receivedAt.getTime(),
        simulated: f.simulated,
      })),
      ahora,
    );
  }
  return out;
}

/**
 * Pulso y oxígeno actuales para el puntaje, o undefined si el reloj no está conectado.
 * Si la tabla todavía no existe (falta `npm run db:push`), el incidente sigue sin signos vitales.
 */
export async function signosActuales(personId: string): Promise<Signos | undefined> {
  try {
    const filas = await lecturasRecientes([personId]);
    const e = estadoReloj(
      filas.map((f) => ({
        metric: f.metric,
        value: f.value,
        ts: f.ts.getTime(),
        recibida: f.receivedAt.getTime(),
        simulated: f.simulated,
      })),
    );
    return e.conectado ? { pulso: e.pulso, spo2: e.spo2 } : undefined;
  } catch (err) {
    console.error("signosActuales: sigo sin signos vitales", err);
    return undefined;
  }
}

/** Último pulso y oxígeno registrados (aunque el reloj ya no esté conectado), para la ficha de emergencia. */
export async function ultimosSignos(personId: string) {
  try {
    const ultima = (metric: Metrica) =>
      db
        .select({ value: lecturas.value, ts: lecturas.ts })
        .from(lecturas)
        .where(and(eq(lecturas.personId, personId), eq(lecturas.metric, metric)))
        .orderBy(desc(lecturas.ts))
        .limit(1)
        .then((r) => r[0] ?? null);
    const [pulso, spo2] = await Promise.all([ultima("heart_rate"), ultima("spo2")]);
    if (!pulso && !spo2) return null;
    return { pulso, spo2 };
  } catch (err) {
    console.error("ultimosSignos", err);
    return null;
  }
}

export async function borrarLecturas(personId: string) {
  await db.delete(lecturas).where(eq(lecturas.personId, personId));
}
