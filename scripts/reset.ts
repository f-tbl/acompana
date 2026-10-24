// Deja la base vacía: borra todas las filas (sin tocar el esquema) y los clips guardados.
// Uso: npm run db:reset  (después, npm run db:seed para recargar el demo)
import { createClient } from "@supabase/supabase-js";
import { contacts, events, fichaLinks, homes, lecturas, persons } from "../src/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local: se usan las variables del entorno
}

async function main() {
  // Import dinámico: el cliente lee DATABASE_URL al cargarse, después de loadEnvFile.
  const { db } = await import("../src/db");
  await db.delete(lecturas);
  await db.delete(fichaLinks);
  await db.delete(events);
  await db.delete(contacts);
  await db.delete(persons);
  await db.delete(homes);
  console.log("Tablas vaciadas");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const { error } = await createClient(url, key).storage.emptyBucket("clips");
    if (error && !/not found/i.test(error.message)) throw error;
    console.log("Bucket «clips» vaciado");
  } else {
    console.warn("Sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: no se vació el bucket de clips");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
