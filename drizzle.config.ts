import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local: se usan las variables del entorno
}

// drizzle-kit corre fuera de Next: usar la conexión directa (puerto 5432) para migrar.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
});
