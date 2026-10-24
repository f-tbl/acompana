// Carga los datos del demo: la casa de Rosa (82, demencia leve) y su nieto Tomi (4).
// Uso: npm run db:seed  (borra todo y vuelve a cargar)
import { createClient } from "@supabase/supabase-js";
import { contacts, events, fichaLinks, homes, persons } from "../src/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local: se usan las variables del entorno
}

async function main() {
  // Import dinámico: el cliente lee DATABASE_URL al cargarse, después de loadEnvFile.
  const { db } = await import("../src/db");
  await db.delete(fichaLinks);
  await db.delete(events);
  await db.delete(contacts);
  await db.delete(persons);
  await db.delete(homes);

  const [home] = await db
    .insert(homes)
    .values({ name: "Casa de Rosa", address: "Av. Corrientes 1234, 3° B, CABA", lat: -34.6037, lng: -58.3816 })
    .returning();

  await db.insert(persons).values([
    {
      homeId: home.id,
      name: "Rosa",
      age: 82,
      perfil: "dependiente",
      avatar: "👵",
      diagnoses: ["Demencia tipo Alzheimer leve", "Hipertensión arterial"],
      allergies: ["Penicilina"],
      medications: [
        { nombre: "Donepecilo", dosis: "10 mg", horario: "22:00" },
        { nombre: "Enalapril", dosis: "10 mg", horario: "08:00 y 20:00" },
      ],
      bloodType: "A+",
      doctorName: "Dra. Marta Giménez",
      doctorPhone: "+54 11 4555-0101",
      advanceDirectives: "No desea maniobras de reanimación invasivas (documento firmado en 2025).",
      notes: "Se desorienta al atardecer. Responde bien cuando le habla su hija Laura.",
      calmScript: [
        "Mamá, soy Laura. Estás en tu casa, en {lugar}.",
        "Son las {hora}. Todo está bien, ya me avisaron y viene ayuda.",
        "Respiremos juntas. Tomá aire despacio... y soltalo despacio.",
        "Muy bien, mamá. Quedate tranquila, no estás sola.",
      ],
    },
    {
      homeId: home.id,
      name: "Tomi",
      age: 4,
      perfil: "nino",
      avatar: "👦",
      diagnoses: [],
      allergies: ["Maní"],
      medications: [],
      bloodType: "0+",
      doctorName: "Dr. Pablo Ruiz (pediatra)",
      doctorPhone: "+54 11 4555-0202",
      calmScript: [
        "Tomi, soy mamá. Ya me avisaron, ya voy.",
        "Quedate quietito ahí, ¿sí? Todo va a estar bien.",
        "Vamos a respirar como un globo: inflamos... y desinflamos.",
      ],
    },
  ]);

  await db.insert(contacts).values([
    { homeId: home.id, name: "Laura", relation: "hija / mamá de Tomi", phone: "+54 11 5555-1111", role: "principal", priority: 0 },
    { homeId: home.id, name: "Marcos", relation: "hijo", phone: "+54 11 5555-2222", role: "secundario", priority: 1 },
    { homeId: home.id, name: "Graciela", relation: "vecina del 3° A", phone: "+54 11 5555-3333", role: "vecino", priority: 2 },
    { homeId: home.id, name: "Teleasistencia CABA", relation: "servicio", phone: "147", role: "teleasistencia", priority: 3 },
  ]);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const storage = createClient(url, key).storage;
    const { error } = await storage.createBucket("clips", { public: false, fileSizeLimit: "20MB" });
    if (error && !/exist/i.test(error.message)) throw error;
    console.log("Bucket «clips» listo");
  } else {
    console.warn("Sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: no se creó el bucket de clips");
  }

  console.log("Datos del demo cargados");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
