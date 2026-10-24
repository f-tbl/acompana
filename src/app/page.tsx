import {
  Ambulance,
  BellRing,
  Camera,
  ChevronDown,
  FileHeart,
  HeartHandshake,
  History,
  House,
  Mic,
  PhoneCall,
  QrCode,
  Stethoscope,
  UserRound,
  Users,
  Volume2,
  Watch,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MonitorCaida } from "@/components/landing/monitor-caida";
import { Reloj } from "@/components/landing/reloj";
import { Revelar } from "@/components/landing/revelar";
import { QrLink } from "@/components/qr-link";
import { NIVELES, type Nivel } from "@/lib/score";

export const metadata: Metadata = {
  title: { absolute: "Acompañar · Seguridad en casa para quien no puede valerse por sí mismo" },
  description:
    "Acompañar cuida a quien pasa tiempo solo en casa. Si se cae o pide ayuda, le habla, evalúa la gravedad y avisa a quien corresponda con un video corto del momento. El video no sale de la casa.",
};

/* ───────────────────────── Contenido ───────────────────────── */

// El demo pide iniciar sesión: el proxy redirige a /login y vuelve acá.
const DEMO_URL = "/demo";

const PARA_QUIEN = [
  "Personas mayores que viven solas o pasan horas solas",
  "Personas con demencia o deterioro cognitivo",
  "Personas con discapacidad intelectual",
  "Personas con enfermedades neurológicas",
  "Chicos que todavía no pueden resolver solos lo que necesitan",
];

const PASOS = [
  {
    icono: Camera,
    titulo: "Detecta",
    texto:
      "Las cámaras de los ambientes comunes reconocen una caída, un movimiento brusco o una inmovilidad larga. Los micrófonos escuchan gritos y pedidos de ayuda en toda la casa.",
  },
  {
    icono: Volume2,
    titulo: "Pregunta",
    texto: "El altavoz de ese ambiente le habla: «¿Estás bien? ¿Pasó algo?». Espera la respuesta unos 15 segundos.",
  },
  {
    icono: Stethoscope,
    titulo: "Evalúa",
    texto:
      "Según lo que pasó, lo que respondió, la hora y su contexto del día, calcula un puntaje de 1 a 10. Contestar con coherencia lo baja; el silencio o la confusión lo suben.",
  },
  {
    icono: BellRing,
    titulo: "Avisa",
    texto:
      "Si hace falta, te llega una alerta al celular con un video corto del momento. Decidís en segundos: falsa alarma, «me ocupo» o pedir ambulancia.",
  },
];

const COLOR_NIVEL: Record<Nivel, string> = {
  1: "bg-n1",
  2: "bg-n2",
  3: "bg-n3",
  4: "bg-n4",
};

const EJEMPLO_NIVEL: Record<Nivel, string> = {
  1: "Se sentó de golpe y contestó «estoy bien». Se olvidó una pastilla.",
  2: "Está desorientada o pide ayuda sin señales de gravedad.",
  3: "Se cayó y dice que le duele, o salió de la casa de noche.",
  4: "Se cayó y no responde.",
};

const CALMA = [
  { titulo: "Preguntar", texto: "«¿Estás bien? ¿Pasó algo?», por el altavoz del ambiente donde ocurrió." },
  { titulo: "Identificarse", texto: "Con una voz conocida: «Mamá, soy Laura, estás en tu casa, todo está bien»." },
  { titulo: "Orientar", texto: "Dónde está, qué hora es y qué está pasando, en frases cortas." },
  { titulo: "Evaluar", texto: "Preguntas de sí o no: «¿Te duele algo?», «¿Podés levantarte?». Mide si responde, cuánto tarda y si es coherente." },
  { titulo: "Regular", texto: "Respiración guiada, su música o recordatorios que la tranquilicen." },
];

const ROLES = [
  { icono: UserRound, titulo: "La persona cuidada", texto: "No tiene que aprender nada ni usar ninguna pantalla. Habla y la casa le contesta." },
  {
    icono: Users,
    titulo: "Cuidadores",
    texto: "Un principal y los que siguen: hijos, vecinos, teleasistencia. Reciben las alertas en orden y ven el historial.",
  },
  { icono: Stethoscope, titulo: "Médicos y enfermería", texto: "Consultan el registro diario y, más adelante, un informe mensual." },
  {
    icono: Ambulance,
    titulo: "Emergencias",
    texto: "Reciben un enlace temporal con la ubicación, la ficha médica y lo que pasó. Sin cuentas ni contraseñas.",
  },
];

const PREGUNTAS = [
  {
    p: "¿Graba todo el día?",
    r: "No. El video se analiza en el equipo de la casa y se descarta. Solo cuando hay una alerta se guarda un clip de unos segundos, en un almacenamiento privado al que se accede con un enlace firmado.",
  },
  {
    p: "¿Hay cámaras en el baño o en el dormitorio?",
    r: "Nunca. En esos ambientes hay solo micrófono y altavoz, para poder hablarle a la persona sin invadir su intimidad.",
  },
  {
    p: "¿Qué pasa si se activa por nada?",
    r: "Si la persona contesta con coherencia que está bien, no te molesta: queda anotado en el historial. Y si te llega una alerta, el video te deja comprobar en segundos si es real y cancelarla con «Falsa alarma».",
  },
  {
    p: "¿Y si no veo la alerta?",
    r: "Escala sola. Pasa al siguiente contacto, después al vecino y a la teleasistencia y, en los casos graves, llama a emergencias con la ubicación y la ficha médica.",
  },
  {
    p: "¿Qué pasa si se corta internet o la luz?",
    r: "El equipo de la casa da señales de vida cada pocos segundos. Si deja de hacerlo, la app del cuidador avisa que la casa quedó sin conexión.",
  },
  {
    p: "¿Hace falta un reloj o una pulsera?",
    r: "No. La base son cámaras, micrófonos y altavoces, porque un reloj se puede sacar. Un reloj con pulso, oxígeno y detección de caídas es opcional y suma información al puntaje.",
  },
  {
    p: "¿Reemplaza a un cuidador o a la teleasistencia?",
    r: "No. Acompañar complementa la teleasistencia y la supervisión de un adulto. No reemplaza la atención médica ni la presencia de una persona.",
  },
  {
    p: "¿Quién da el consentimiento?",
    r: "Son datos de salud, especialmente protegidos. El consentimiento suele darlo la persona o su representante legal, y el sistema está pensado para respetar su dignidad e intimidad.",
  },
];

const PANTALLAS = [
  { href: "/casa", icono: House, titulo: "Equipo de la casa", texto: "Abrilo en una notebook o un celular con cámara, micrófono y altavoz. Usá Chrome." },
  { href: "/cuidador", icono: BellRing, titulo: "App del cuidador", texto: "Alertas en vivo con el video, «Pedir ambulancia», «Falsa alarma» y pedidos." },
  { href: "/reloj", icono: Watch, titulo: "Reloj (simulador)", texto: "Hace de reloj inteligente: manda pulso, oxígeno, pasos y caídas." },
  { href: "/historial", icono: History, titulo: "Historial", texto: "Todo lo que pasó en el día, incluidas las falsas alarmas." },
  { href: "/perfiles", icono: FileHeart, titulo: "Fichas médicas", texto: "Lo que recibe emergencias junto con la ubicación." },
];

const GUION = [
  "Falsa alarma: sentate de golpe frente a la cámara y respondé «estoy bien». Solo queda en el historial.",
  "Emergencia: «caete» frente a la cámara y no respondas. Al celular llega la alerta con el video.",
  "Tocá «Pedir ambulancia»: se genera el enlace con la ubicación y la ficha, con un QR (simulado).",
  "Chicos: cambiá el perfil a Tomi y decí «tengo sed». El pedido llega al celular.",
  "Reloj: en el simulador tocá «Pulso alto». La casa pregunta si está bien y al celular llega la alerta con el pulso.",
];

/* ───────────────────────── Página ───────────────────────── */

export default function Landing() {
  return (
    <div className="landing bg-papel text-tinta">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-lampara px-4 py-2 font-bold text-noche focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>

      <Hero />

      <main id="contenido" tabIndex={-1} className="outline-none">
        <ParaQuien />
        <ComoFunciona />
        <Niveles />
        <SeccionReloj />
        <Voz />
        <Privacidad />
        <Emergencia />
        <Roles />
        <Preguntas />
        <Demo />
      </main>

      <Pie />
      <Revelar />
    </div>
  );
}

/* ───────────────────────── Secciones ───────────────────────── */

function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xl font-bold tracking-tight ${claro ? "text-white" : "text-noche"}`}>
      <HeartHandshake aria-hidden className={`size-6 ${claro ? "text-lampara" : "text-hoja"}`} />
      Acompañar
    </span>
  );
}

function Hero() {
  return (
    <header className="relative overflow-hidden bg-noche text-white">
      <nav aria-label="Principal" className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Acompañar, inicio" className="rounded-md">
          <Logo claro />
        </Link>
        <ul className="hidden items-center gap-7 text-[0.95rem] text-white/80 md:flex">
          <li><a className="hover:text-white" href="#como-funciona">Cómo funciona</a></li>
          <li><a className="hover:text-white" href="#niveles">Niveles</a></li>
          <li><a className="hover:text-white" href="#reloj">Reloj</a></li>
          <li><a className="hover:text-white" href="#privacidad">Privacidad</a></li>
          <li><a className="hover:text-white" href="#preguntas">Preguntas</a></li>
        </ul>
        <a
          href={DEMO_URL}
          className="rounded-full bg-lampara px-4 py-2 text-[0.95rem] font-bold text-noche transition-colors hover:bg-white"
        >
          Probar el demo
        </a>
      </nav>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16 lg:pb-28">
        <div>
          <p className="text-lg text-salvia/90">Si se cae estando sola, la casa le pregunta:</p>
          <h1 className="mt-4 text-[clamp(2.75rem,8vw,5.75rem)] leading-[0.98] font-bold tracking-[-0.03em] text-lampara">
            «¿Estás bien?
            <br />
            ¿Pasó algo?»
          </h1>
          <p className="mt-8 max-w-xl text-xl leading-relaxed text-white/90">
            Acompañar cuida a quien pasa tiempo solo en casa y no puede valerse por sí mismo. Le habla, escucha cómo responde y te avisa
            solo cuando hace falta, con un video corto para que decidas en segundos.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={DEMO_URL} className="rounded-full bg-lampara px-6 py-3.5 text-lg font-bold text-noche transition-colors hover:bg-white">
              Probar el demo
            </a>
            <a
              href="#como-funciona"
              className="rounded-full border border-white/35 px-6 py-3.5 text-lg font-bold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-8 flex items-center gap-2 text-[0.95rem] text-white/70">
            <Camera aria-hidden className="size-4" /> El video se procesa dentro de la casa y no sale de ella.
          </p>
        </div>

        <MonitorCaida />
      </div>
    </header>
  );
}

function Seccion({
  id,
  titulo,
  bajada,
  children,
  className = "",
}: {
  id: string;
  titulo: string;
  bajada?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={`scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <h2 id={`${id}-t`} className="max-w-3xl text-[clamp(2rem,4.5vw,3rem)] leading-[1.08] font-bold tracking-[-0.02em] text-noche">
          {titulo}
        </h2>
        {bajada && <p className="mt-5 max-w-2xl text-xl leading-relaxed text-tinta/80">{bajada}</p>}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function ParaQuien() {
  return (
    <section aria-labelledby="para-quien-t" className="border-b border-noche/10 px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 id="para-quien-t" className="text-2xl leading-snug font-bold text-noche">
          Para las horas en que la persona que cuidás está sola
        </h2>
        <ul className="flex flex-wrap gap-2.5">
          {PARA_QUIEN.map((p) => (
            <li key={p} className="rounded-2xl border border-noche/15 bg-white px-4 py-2 text-[1.05rem]">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ComoFunciona() {
  return (
    <Seccion
      id="como-funciona"
      titulo="No te avisa por todo. Te avisa cuando importa."
      bajada="Antes de molestarte, la casa le pregunta a la persona cómo está. Su respuesta decide qué pasa después."
    >
      <ol className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
        {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} className="border-t-2 border-noche pt-5">
            <span className="flex items-center justify-between">
              <span className="text-lg font-bold text-hoja tabular-nums">Paso {i + 1}</span>
              <Icono aria-hidden className="size-6 text-hoja" />
            </span>
            <h3 className="mt-3 text-2xl font-bold text-noche">{titulo}</h3>
            <p className="mt-2 text-[1.05rem] leading-relaxed text-tinta/80">{texto}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-salvia p-7">
          <h3 className="text-xl font-bold text-noche">Si contesta con coherencia que está bien</h3>
          <p className="mt-2 text-[1.05rem] leading-relaxed">
            Queda anotado en el historial y no te llega ninguna alerta. Lo ves cuando quieras.
          </p>
        </div>
        <div className="rounded-3xl bg-noche p-7 text-white">
          <h3 className="text-xl font-bold text-lampara">Si pide ayuda, se lastimó, está confusa o no contesta</h3>
          <p className="mt-2 text-[1.05rem] leading-relaxed text-white/90">
            Te llega la alerta con el video del momento. Si nadie responde a tiempo, Acompañar escala solo: al siguiente contacto, al
            vecino, a la teleasistencia y, si hace falta, a emergencias.
          </p>
        </div>
      </div>
    </Seccion>
  );
}

function Niveles() {
  const niveles = Object.keys(NIVELES).map(Number) as Nivel[];
  return (
    <Seccion
      id="niveles"
      className="bg-white"
      titulo="Cada situación tiene un puntaje del 1 al 10"
      bajada="No es lo mismo sentarse de golpe a las once de la mañana que caerse a las tres de la madrugada sin responder. El puntaje combina qué pasó, cómo respondió, la hora y cómo viene su día."
    >
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: 10 }, (_, k) => {
          const n = k + 1;
          const nivel: Nivel = n <= 3 ? 1 : n <= 6 ? 2 : n <= 8 ? 3 : 4;
          return (
            <span key={n} className={`flex h-12 flex-1 items-end rounded-md px-2 pb-1.5 text-sm font-bold text-white ${COLOR_NIVEL[nivel]}`}>
              {n}
            </span>
          );
        })}
      </div>

      <ol className="mt-8 grid gap-8 md:grid-cols-[3fr_3fr_2fr_2fr]">
        {niveles.map((n) => (
          <li key={n}>
            <p className="flex items-center gap-2">
              <span aria-hidden className={`size-3 rounded-full ${COLOR_NIVEL[n]}`} />
              <span className="font-bold tabular-nums">{NIVELES[n].rango}</span>
              <span className="text-tinta/70">{NIVELES[n].titulo}</span>
            </p>
            <h3 className="mt-2 text-lg leading-snug font-bold text-noche">{EJEMPLO_NIVEL[n]}</h3>
            <p className="mt-2 leading-relaxed text-tinta/80">{NIVELES[n].accion}.</p>
          </li>
        ))}
      </ol>

      <p className="mt-12 max-w-3xl border-l-4 border-lampara pl-5 text-lg leading-relaxed">
        En los casos graves no se pierde tiempo: la casa sigue hablándole y calmándola mientras las alertas ya están saliendo, nunca antes.
      </p>
    </Seccion>
  );
}

function SeccionReloj() {
  const senales = [
    ["Pulso alto estando quieta", "Distingue el pulso alto al caminar del que sube sin moverse, que es el que preocupa."],
    ["Oxígeno que baja", "Si la saturación cae, el puntaje sube aunque en la cámara se la vea tranquila."],
    ["Caídas fuera de cámara", "En el baño, el jardín o la calle. El reloj detecta el golpe y se sigue el mismo protocolo."],
  ];
  return (
    <Seccion
      id="reloj"
      titulo="Lo que la cámara no ve, lo siente el reloj"
      bajada="Opcional: un reloj o pulsera suma pulso, oxígeno y caídas al puntaje. La base sigue siendo la casa, porque un reloj se puede sacar."
    >
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <Reloj />
        <ul className="border-t-2 border-noche">
          {senales.map(([titulo, texto]) => (
            <li key={titulo} className="border-b border-noche/15 py-6">
              <h3 className="text-2xl font-bold text-noche">{titulo}</h3>
              <p className="mt-2 text-[1.05rem] leading-relaxed text-tinta/80">{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </Seccion>
  );
}

function Voz() {
  return (
    <Seccion
      id="voz"
      titulo="Una voz conocida, no una sirena"
      bajada="Le habla con calma, como lo haría alguien de la familia. Y la escucha: también puede pedir lo que necesita en cualquier momento."
    >
      <div className="grid gap-14 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-bold text-noche">Para calmarla y entender cómo está</h3>
          <ol className="mt-6 space-y-5">
            {CALMA.map((c, i) => (
              <li key={c.titulo} className="grid grid-cols-[2.25rem_1fr] gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-salvia font-bold text-noche tabular-nums">{i + 1}</span>
                <p className="pt-1 text-[1.05rem] leading-relaxed">
                  <strong className="text-noche">{c.titulo}.</strong> {c.texto}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-7 text-[1.05rem] leading-relaxed text-tinta/80">
            Se adapta a cada perfil. Con demencia usa la técnica de validación: no contradice, redirige la conversación. Con chicos usa
            palabras simples y una voz que reconocen. Lo que responde ajusta el puntaje en tiempo real.
          </p>
        </div>

        <div className="rounded-[2rem] bg-noche p-6 text-white sm:p-8">
          <h3 className="text-2xl font-bold text-lampara">Para pedir lo que necesita</h3>
          <p className="mt-2 text-white/85">«Necesito agua», «me duele la cabeza», «quiero ir al baño».</p>
          <div className="mt-8 space-y-4" role="img" aria-label="Ejemplo: Tomi dice que tiene sed, el pedido le llega a Laura al celular, ella toca Voy y el altavoz le avisa a Tomi que ya va.">
            <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-lg text-noche">
              <span className="block text-sm text-tinta/60">Tomi, en la cocina</span>«Tengo sed»
            </p>
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-noche-2 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-salvia/80"><BellRing className="size-4" /> Celular de Laura</span>
              <span className="mt-1 block text-lg font-bold">Tomi pide agua</span>
              <span className="mt-3 inline-block rounded-lg bg-lampara px-4 py-1.5 font-bold text-noche">Voy</span>
            </div>
            <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-salvia px-4 py-3 text-lg text-noche">
              <span className="flex items-center gap-2 text-sm text-noche/70"><Volume2 className="size-4" /> Altavoz de la cocina</span>
              «Tomi, mamá ya viene»
            </p>
          </div>
        </div>
      </div>
    </Seccion>
  );
}

function Privacidad() {
  const ambientes = [
    { area: "dorm", nombre: "Dormitorio", camara: false },
    { area: "living", nombre: "Living", camara: true },
    { area: "bano", nombre: "Baño", camara: false },
    { area: "pasillo", nombre: "Pasillo", camara: true },
    { area: "cocina", nombre: "Cocina", camara: true },
    { area: "entrada", nombre: "Entrada", camara: true },
  ];
  return (
    <Seccion
      id="privacidad"
      className="bg-white"
      titulo="Cuida sin mirar donde no corresponde"
      bajada="La intimidad y la dignidad de la persona son parte del diseño, no un ajuste que se agrega después."
    >
      <div className="grid items-start gap-14 lg:grid-cols-[1fr_1fr]">
        <figure>
          <div className="plano grid gap-1.5 rounded-3xl bg-noche p-1.5" role="img" aria-label="Plano de una casa: hay cámara, micrófono y altavoz en living, cocina, pasillo y entrada. En baño y dormitorio hay solo micrófono y altavoz, sin cámara.">
            {ambientes.map((a) => (
              <div
                key={a.area}
                style={{ gridArea: a.area }}
                className={`flex min-h-24 flex-col justify-between rounded-2xl p-3.5 ${a.camara ? "bg-salvia" : "bg-white"}`}
              >
                <span className="font-bold text-noche">{a.nombre}</span>
                <span className="flex items-center gap-2 text-noche">
                  {a.camara && <Camera aria-hidden className="size-5" />}
                  <Mic aria-hidden className="size-5" />
                  <Volume2 aria-hidden className="size-5" />
                </span>
              </div>
            ))}
          </div>
          <figcaption className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-tinta/80">
            <span className="flex items-center gap-2"><span className="size-3.5 rounded bg-salvia ring-1 ring-noche/20" /> Cámara, micrófono y altavoz</span>
            <span className="flex items-center gap-2"><span className="size-3.5 rounded bg-white ring-1 ring-noche/30" /> Solo micrófono y altavoz</span>
          </figcaption>
        </figure>

        <ul className="space-y-7">
          {[
            ["Nunca hay cámaras en el baño ni en el dormitorio.", "Ahí solo hay micrófono y altavoz, para poder hablarle esté donde esté."],
            ["El video no sale de la casa.", "Se analiza en el equipo de la casa, en el momento, y se descarta. No hay grabación continua."],
            [
              "Solo se envían unos segundos, y solo si hay alerta.",
              "Para que puedas comprobar si es real. Se guardan en un almacenamiento privado y se ven con un enlace firmado.",
            ],
            [
              "Son datos de salud, y se tratan como tales.",
              "El consentimiento lo da la persona o su representante legal, y la ficha médica solo se comparte con emergencias mediante un enlace que vence.",
            ],
          ].map(([t, d]) => (
            <li key={t} className="border-l-4 border-hoja pl-5">
              <h3 className="text-xl font-bold text-noche">{t}</h3>
              <p className="mt-1.5 text-[1.05rem] leading-relaxed text-tinta/80">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </Seccion>
  );
}

function Emergencia() {
  const ficha = ["Diagnósticos", "Alergias", "Medicación actual", "Grupo sanguíneo", "Médico de cabecera", "Contactos", "Voluntades anticipadas"];
  return (
    <Seccion
      id="emergencia"
      titulo="Si hay que pedir una ambulancia, no hay que explicar nada"
      bajada="Con un toque, emergencias recibe todo lo que necesita para llegar y atender, en un enlace temporal con código QR."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-noche/15 bg-white p-7">
          <PhoneCall aria-hidden className="size-7 text-hoja" />
          <h3 className="mt-4 text-xl font-bold text-noche">Dónde está</h3>
          <p className="mt-2 text-[1.05rem] leading-relaxed text-tinta/80">La dirección exacta de la casa, con piso y departamento.</p>
        </div>
        <div className="rounded-3xl border border-noche/15 bg-white p-7">
          <FileHeart aria-hidden className="size-7 text-hoja" />
          <h3 className="mt-4 text-xl font-bold text-noche">Quién es</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {ficha.map((f) => (
              <li key={f} className="rounded-full bg-salvia px-3 py-1 text-[0.95rem]">{f}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-noche/15 bg-white p-7">
          <QrCode aria-hidden className="size-7 text-hoja" />
          <h3 className="mt-4 text-xl font-bold text-noche">Qué pasó</h3>
          <p className="mt-2 text-[1.05rem] leading-relaxed text-tinta/80">
            El incidente, la hora y cómo respondió. El enlace vence a las pocas horas.
          </p>
        </div>
      </div>
    </Seccion>
  );
}

function Roles() {
  return (
    <Seccion id="roles" className="bg-white" titulo="Cada uno ve lo que necesita">
      <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
        {ROLES.map(({ icono: Icono, titulo, texto }) => (
          <div key={titulo} className="grid grid-cols-[3rem_1fr] gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-salvia">
              <Icono aria-hidden className="size-6 text-noche" />
            </span>
            <div>
              <dt className="text-xl font-bold text-noche">{titulo}</dt>
              <dd className="mt-1.5 text-[1.05rem] leading-relaxed text-tinta/80">{texto}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Seccion>
  );
}

function Preguntas() {
  return (
    <Seccion id="preguntas" className="bg-white" titulo="Preguntas frecuentes">
      <div className="max-w-3xl divide-y divide-noche/15 border-y border-noche/15">
        {PREGUNTAS.map(({ p, r }) => (
          <details key={p} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-4 text-xl font-bold text-noche [&::-webkit-details-marker]:hidden">
              {p}
              <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-[1.05rem] leading-relaxed text-tinta/80">{r}</p>
          </details>
        ))}
      </div>
    </Seccion>
  );
}

function Demo() {
  return (
    <Seccion
      id="demo"
      className="bg-salvia"
      titulo="Probalo ahora"
      bajada="Necesitás dos dispositivos: uno hace de casa y otro de celular del cuidador. También funciona con dos pestañas."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {PANTALLAS.map(({ href, icono: Icono, titulo, texto }) => (
          <Link key={href} href={href} className="group flex gap-4 rounded-3xl bg-white p-6 transition-colors hover:bg-papel">
            <Icono aria-hidden className="mt-0.5 size-7 shrink-0 text-hoja" />
            <span>
              <span className="block text-xl font-bold text-noche underline-offset-4 group-hover:underline">{titulo}</span>
              <span className="mt-1 block leading-relaxed text-tinta/80">{texto}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-3xl bg-white p-7">
          <h3 className="text-xl font-bold text-noche">Qué probar</h3>
          <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-[1.05rem] leading-relaxed">
            {GUION.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
          <p className="mt-5 text-[0.95rem] text-tinta/70">
            Con buena luz y la cámara a 2 o 3 metros funciona mejor. Si la detección falla, el panel de simulación de la casa recorre el mismo
            flujo.
          </p>
        </div>
        <div className="flex items-center gap-5 rounded-3xl bg-noche p-7 text-white">
          <QrLink path="/cuidador" />
          <div className="max-w-48">
            <p className="text-lg font-bold">Abrí la app del cuidador en tu celular</p>
            <p className="mt-1 text-white/75">Escaneá el código y dejala abierta.</p>
          </div>
        </div>
      </div>
    </Seccion>
  );
}

function Pie() {
  return (
    <footer className="bg-noche px-4 py-12 text-white/75 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Logo claro />
          <p className="mt-3 max-w-md leading-relaxed">Seguridad en casa para quien no puede valerse por sí mismo.</p>
        </div>
        <p className="max-w-xl text-[0.95rem] leading-relaxed">
          Prototipo en desarrollo. Acompañar complementa la teleasistencia y la supervisión de un adulto; no reemplaza la atención médica ni
          los servicios de emergencia. En el demo, las llamadas a emergencias son simuladas. Ante una emergencia real, llamá al 107 o al 911.
        </p>
      </div>
    </footer>
  );
}
