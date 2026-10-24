import { NextResponse } from "next/server";
import { z } from "zod";
import { borrarLecturas } from "@/server/vitales";

const Body = z.object({ personId: z.string().uuid() });

/** Reinicia el demo del reloj: borra las lecturas de esa persona. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  await borrarLecturas(body.data.personId);
  return NextResponse.json({ ok: true });
}
