import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// En Vercel usar el pooler de Supabase en modo transacción (puerto 6543):
// no soporta prepared statements, por eso prepare: false.
// postgres() no abre conexión hasta la primera query, así el build no necesita la DB.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

const client =
  globalForDb.pg ??
  postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/sin-configurar", {
    prepare: false,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle({ client, schema });
export { schema };
