import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FichaMedica } from "@/components/ficha/ficha-medica";
import { NOMBRE_EVENTO, NOMBRE_RESPUESTA, type Respuesta } from "@/lib/score";
import { fechaCasa } from "@/lib/utils";
import { fichaPorToken } from "@/server/events";

export const metadata: Metadata = { title: "Paquete de emergencia · Acompañar", robots: { index: false } };

/** Lo que recibirían emergencias: enlace temporal con ubicación, ficha y el incidente. */
export default function FichaPage({ params }: PageProps<"/ficha/[token]">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-stone-50" />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const datos = await fichaPorToken(token);

  if (!datos) {
    return (
      <main className="grid min-h-dvh place-items-center bg-stone-50 p-6 text-center text-stone-700">
        <p>Este enlace venció o no existe. Los enlaces de la ficha médica son temporales.</p>
      </main>
    );
  }

  const { persona, home, contactos, evento, link, signos } = datos;
  const mapa = `https://www.google.com/maps?q=${home.lat},${home.lng}`;

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-2xl bg-rose-600 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Paquete de emergencia · simulado</p>
          <h1 className="text-lg font-semibold">
            {evento ? `${NOMBRE_EVENTO[evento.type]} · puntaje ${evento.score}/10` : "Ficha médica"}
          </h1>
          {evento && (
            <p className="text-sm opacity-90">
              {fechaCasa(evento.createdAt)} · {evento.room} ·{" "}
              {evento.assessment ? NOMBRE_RESPUESTA[evento.assessment.clasificacion as Respuesta] ?? evento.assessment.clasificacion : ""}
              {evento.responseText && <> · dijo «{evento.responseText}»</>}
            </p>
          )}
        </header>

        <a href={mapa} target="_blank" className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 hover:bg-stone-50">
          <MapPin className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">{home.address}</p>
            <p className="text-sm text-stone-500">
              {home.lat.toFixed(5)}, {home.lng.toFixed(5)} · abrir en el mapa
            </p>
          </div>
        </a>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <FichaMedica persona={persona} contactos={contactos} />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Último registro de signos vitales</h3>
          {signos ? (
            <dl className="grid grid-cols-2 gap-3">
              {signos.pulso && (
                <div className="rounded-xl bg-stone-100 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide opacity-70">Pulso</dt>
                  <dd className="text-lg font-semibold">{signos.pulso.value} lpm</dd>
                  <dd className="text-xs text-stone-500">{fechaCasa(signos.pulso.ts)}</dd>
                </div>
              )}
              {signos.spo2 && (
                <div className="rounded-xl bg-stone-100 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide opacity-70">Oxígeno (SpO₂)</dt>
                  <dd className="text-lg font-semibold">{signos.spo2.value}%</dd>
                  <dd className="text-xs text-stone-500">{fechaCasa(signos.spo2.ts)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-stone-600">Sin datos del reloj.</p>
          )}
        </section>

        <p className="text-center text-xs text-stone-500">
          Enlace válido hasta {fechaCasa(link.expiresAt)}. Este sistema complementa la teleasistencia y no reemplaza la
          atención médica.
        </p>
      </div>
    </main>
  );
}
