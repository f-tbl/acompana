import { NextResponse } from "next/server";
import { z } from "zod";
import { guardarClip } from "@/server/events";

const Body = z.object({ path: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  await guardarClip(id, body.data.path);
  return NextResponse.json({ ok: true });
}
