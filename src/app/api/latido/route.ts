import { NextResponse } from "next/server";
import { latidoHub } from "@/server/events";

export async function POST() {
  await latidoHub();
  return NextResponse.json({ ok: true });
}
