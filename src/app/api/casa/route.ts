import { connection, NextResponse } from "next/server";
import { datosCasa } from "@/server/events";

export async function GET() {
  await connection();
  return NextResponse.json(await datosCasa());
}
