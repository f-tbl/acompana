import { NextResponse } from "next/server";
import { reactivarDeteccion } from "@/server/events";

export async function POST() {
  await reactivarDeteccion();
  return NextResponse.json({ ok: true });
}
