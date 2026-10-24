import { connection, NextResponse } from "next/server";
import { listarEventos } from "@/server/events";

export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const [activos, recientes] = await Promise.all([
    listarEventos({ soloActivos: true, limit: 20 }),
    listarEventos({ limit: Number(searchParams.get("limit") ?? 15) }),
  ]);
  return NextResponse.json({ activos, recientes });
}
