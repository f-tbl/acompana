"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});

  return (
    <form action={accion} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="font-bold text-noche">Usuario</span>
        <input
          name="usuario"
          autoComplete="username"
          required
          defaultValue={estado.usuario}
          className="mt-2 block w-full rounded-xl border border-noche/20 bg-white px-4 py-3 text-lg outline-none focus:border-hoja focus:ring-2 focus:ring-hoja/30"
        />
      </label>
      <label className="block">
        <span className="font-bold text-noche">Contraseña</span>
        <input
          name="clave"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 block w-full rounded-xl border border-noche/20 bg-white px-4 py-3 text-lg outline-none focus:border-hoja focus:ring-2 focus:ring-hoja/30"
        />
      </label>
      {estado.error && (
        <p role="alert" className="rounded-xl bg-n4/10 px-4 py-3 font-semibold text-n4">
          {estado.error}
        </p>
      )}
      <button
        disabled={enviando}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-noche px-6 py-3.5 text-lg font-bold text-white transition-colors hover:bg-noche-2 disabled:opacity-60"
      >
        <LogIn aria-hidden className="size-5" />
        {enviando ? "Entrando…" : "Entrar al demo"}
      </button>
    </form>
  );
}
