import { ArrowRight, BellRing, FileHeart, History, House, LogOut, ShieldCheck, Watch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { QrLink } from "@/components/qr-link";
import { NIVELES, type Nivel } from "@/lib/score";

const PANTALLAS = [
  {
    href: "/casa",
    icono: House,
    titulo: "Equipo de la casa",
    texto: "Notebook o celular con cámara, micrófono y altavoz. Detecta caídas con MediaPipe en el propio navegador.",
  },
  {
    href: "/cuidador",
    icono: BellRing,
    titulo: "App del cuidador",
    texto: "Alertas en tiempo real con el video corto del incidente, botón «Pedir ambulancia» y pedidos por voz.",
  },
  {
    href: "/reloj",
    icono: Watch,
    titulo: "Reloj (simulador)",
    texto: "Hace de reloj inteligente: manda pulso, oxígeno, pasos y caídas. La casa reacciona igual que con la cámara.",
  },
  { href: "/historial", icono: History, titulo: "Historial", texto: "Registro diario de eventos, alertas y falsas alarmas." },
  { href: "/perfiles", icono: FileHeart, titulo: "Fichas médicas", texto: "Lo que se envía a emergencias junto con la ubicación." },
];

const GUION = [
  "Falsa alarma: alguien se sienta de golpe, responde «estoy bien» y solo queda en el historial.",
  "Emergencia: una persona «se cae» y no responde. Al celular llega la alerta con el video.",
  "El cuidador toca «Pedir ambulancia»: se envían la ubicación y la ficha (simulado).",
  "Niño: cambiá el perfil a Tomi y decí «tengo sed». El pedido llega al celular.",
  "Reloj: en /reloj tocá «Pulso alto». La casa pregunta si está bien y el cuidador ve la alerta con el pulso.",
];

export const metadata: Metadata = { title: "Demo · Acompañar" };

export default function Demo() {
  return (
    <main className="min-h-dvh bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <form action={cerrarSesion} className="flex justify-end">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:bg-white">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </form>
        <header className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">
            <ShieldCheck className="size-3.5" /> Privacidad por diseño: el video no sale de la casa
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Acompañar</h1>
          <p className="mt-3 text-lg text-stone-600">
            Vigila a quien pasa tiempo solo y no puede valerse por sí mismo. Ante un problema le habla, evalúa la gravedad y avisa a quien
            corresponda.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PANTALLAS.map(({ href, icono: Icono, titulo, texto }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
            >
              <Icono className="size-6 text-teal-700" />
              <h2 className="mt-3 flex items-center gap-1 font-semibold">
                {titulo} <ArrowRight className="size-4 opacity-0 transition group-hover:opacity-100" />
              </h2>
              <p className="mt-1 text-sm text-stone-600">{texto}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto]">
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Guion del demo</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-700">
              {GUION.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
          </section>
          <section className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5">
            <QrLink path="/cuidador" />
            <div className="max-w-44 text-sm">
              <p className="font-semibold">Abrí la app del cuidador en tu celular</p>
              <p className="mt-1 text-stone-500">Escaneá el código y dejala abierta durante el demo.</p>
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="font-semibold">Puntaje de situación</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {(Object.keys(NIVELES) as unknown as Nivel[]).map((n) => (
              <div key={n} className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="font-mono text-sm text-stone-500">{NIVELES[n].rango}</p>
                <p className="font-semibold">{NIVELES[n].titulo}</p>
                <p className="mt-1 text-sm text-stone-600">{NIVELES[n].accion}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-xs text-stone-500">
          Prototipo de hackathon. Complementa la teleasistencia y la supervisión de un adulto; no reemplaza la atención médica.
        </p>
      </div>
    </main>
  );
}
