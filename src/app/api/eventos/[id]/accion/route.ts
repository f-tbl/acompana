import { NextResponse } from "next/server";
import { z } from "zod";
import { aplicarAccion } from "@/server/events";

const Body = z.object({ accion: z.enum(["cancelar", "atender", "ambulancia", "resolver", "atendido"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const event = await aplicarAccion(id, body.data.accion);
  if (!event) return NextResponse.json({ error: "El evento ya no admite esa acción" }, { status: 409 });
  return NextResponse.json({ event });
}
