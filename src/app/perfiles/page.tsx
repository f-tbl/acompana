import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { FichaMedica } from "@/components/ficha/ficha-medica";
import { datosCasa } from "@/server/events";

export const metadata: Metadata = { title: "Fichas médicas · Acompañar" };

export default function PerfilesPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-stone-50" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const { home, persons, contacts } = await datosCasa();
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <Link href="/" className="text-sm text-stone-500 hover:underline">
            ← Inicio
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Fichas médicas</h1>
          <p className="text-sm text-stone-500">{home.name} · {home.address}</p>
        </header>
        {persons.map((p) => (
          <section key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <FichaMedica persona={p} contactos={contacts} />
          </section>
        ))}
      </div>
    </main>
  );
}
