import { NextResponse } from "next/server";
import { z } from "zod";
import { tipoEventoEnum } from "@/db/schema";
import { crearIncidente } from "@/server/events";

const Body = z.object({
  personId: z.string().uuid(),
  tipo: z.enum(tipoEventoEnum.enumValues),
  room: z.string().min(1).max(40),
  texto: z.string().max(500).nullable(),
  clipExt: z.enum(["webm", "mp4"]).optional(),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  return NextResponse.json(await crearIncidente(body.data));
}
