import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { estadoRelojes, guardarLecturas } from "@/server/vitales";

// Formato de lectura del reloj (real o simulado).
const base = z.object({
  personId: z.string().uuid(),
  source: z.string().min(1).max(64),
  simulated: z.boolean(),
  unit: z.string().min(1).max(16),
  ts: z.number().int().positive(),
});

const Lectura = z.discriminatedUnion("metric", [
  base.extend({ metric: z.literal("heart_rate"), value: z.number().min(20).max(250) }),
  base.extend({ metric: z.literal("spo2"), value: z.number().min(50).max(100) }),
  base.extend({ metric: z.literal("steps"), value: z.number().int().min(0).max(1_000_000) }),
  base.extend({ metric: z.literal("fall"), value: z.union([z.literal(0), z.literal(1)]) }),
]);

const Body = z.object({ readings: z.array(Lectura).min(1).max(100) });

/** El reloj manda sus lecturas acá. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 422 });
  const aceptadas = await guardarLecturas(body.data.readings);
  return NextResponse.json({ ok: true, aceptadas, ignoradas: body.data.readings.length - aceptadas });
}

/** Estado del reloj de cada persona: pulso, oxígeno, pasos, serie y alertas. */
export async function GET() {
  await connection();
  return NextResponse.json({ relojes: await estadoRelojes() });
}
