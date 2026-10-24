"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { destinoSeguro, firmarSesion, SESSION_COOKIE, SESSION_HOURS } from "@/server/session";

export type EstadoLogin = { error?: string; usuario?: string };

// Credenciales del demo. En local, si no están configuradas, se entra con demo / demo.
function credenciales() {
  const dev = process.env.NODE_ENV !== "production";
  return {
    usuario: process.env.DEMO_USER ?? "demo",
    clave: process.env.DEMO_PASSWORD ?? (dev ? "demo" : undefined),
  };
}

function iguales(a: string, b: string) {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

export async function iniciarSesion(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  const esperado = credenciales();

  if (!esperado.clave) return { error: "El acceso al demo no está configurado (falta DEMO_PASSWORD).", usuario };
  // Se comparan las dos cosas siempre, para no revelar cuál falló.
  const ok = [iguales(usuario, esperado.usuario), iguales(clave, esperado.clave)];
  if (!ok.every(Boolean)) return { error: "Usuario o contraseña incorrectos.", usuario };

  (await cookies()).set(SESSION_COOKIE, await firmarSesion(usuario), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
  redirect(destinoSeguro(formData.get("next")));
}

export async function cerrarSesion() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
