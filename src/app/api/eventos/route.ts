import { connection, NextResponse } from "next/server";
import { listarEventos, silencioActual } from "@/server/events";

export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const [activos, recientes, silencioHasta] = await Promise.all([
    listarEventos({ soloActivos: true, limit: 20 }),
    listarEventos({ limit: Number(searchParams.get("limit") ?? 15) }),
    silencioActual(),
  ]);
  return NextResponse.json({ activos, recientes, silencioHasta });
}
