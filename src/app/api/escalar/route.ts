import { NextResponse } from "next/server";
import { escalarPendientes } from "@/server/events";

export async function POST() {
  return NextResponse.json({ cambios: await escalarPendientes() });
}
