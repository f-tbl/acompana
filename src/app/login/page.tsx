import { HeartHandshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Acompañar", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="landing grid min-h-dvh place-items-center bg-noche px-4 py-10">
      <main className="w-full max-w-md rounded-[2rem] bg-papel p-8 text-tinta sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2 rounded-md text-xl font-bold tracking-tight text-noche">
          <HeartHandshake aria-hidden className="size-6 text-hoja" />
          Acompañar
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-noche">Entrá para probar el demo</h1>
        <p className="mt-2 leading-relaxed text-tinta/80">La casa, la app del cuidador y el historial solo funcionan con sesión iniciada.</p>
        <Suspense fallback={<LoginForm />}>
          <FormConDestino searchParams={searchParams} />
        </Suspense>
        <p className="mt-6 text-center text-[0.95rem]">
          <Link href="/" className="text-hoja underline underline-offset-4">
            Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  );
}

async function FormConDestino({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
