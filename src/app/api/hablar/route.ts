import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { persons } from "@/db/schema";
import { interpretarFrase } from "@/server/evaluate";
import { crearIncidente } from "@/server/events";

const Body = z.object({
  personId: z.string().uuid(),
  room: z.string().min(1).max(40),
  texto: z.string().min(1).max(500),
});

/** Modo conversación: la persona le habla al sistema en cualquier momento. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { personId, room, texto } = body.data;

  const persona = await db.query.persons.findFirst({ where: eq(persons.id, personId) });
  if (!persona) return NextResponse.json({ error: "Persona inexistente" }, { status: 404 });

  const frase = await interpretarFrase({ persona, texto });
  if (frase.tipo === "charla") return NextResponse.json({ ...frase, event: null });

  const { event } = await crearIncidente({
    personId,
    room,
    texto,
    tipo: frase.tipo === "ayuda" ? "pedido_ayuda" : "pedido",
    respuesta: frase.tipo === "ayuda" ? "pide_ayuda" : "no_aplica",
    resumen: `${persona.name} (${room.toLowerCase()}): ${frase.resumen}`,
  });
  return NextResponse.json({ ...frase, event });
}
