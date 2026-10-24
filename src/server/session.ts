import { jwtVerify, SignJWT, type JWTPayload } from "jose";

// Sesión sin estado: un JWT firmado con HS256 en una cookie httpOnly.
// Sin "server-only" porque también lo importa src/proxy.ts.

export const SESSION_COOKIE = "acompanar_sesion";
export const SESSION_HOURS = 12;

export type Sesion = JWTPayload & { usuario: string };

function clave() {
  const secreto = process.env.AUTH_SECRET;
  if (secreto) return new TextEncoder().encode(secreto);
  // En local se puede probar sin configurar nada; en producción el secreto es obligatorio.
  if (process.env.NODE_ENV !== "production") return new TextEncoder().encode("acompanar-dev-secret-no-usar-en-produccion");
  throw new Error("Falta AUTH_SECRET");
}

export async function firmarSesion(usuario: string) {
  return new SignJWT({ usuario })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(usuario)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(clave());
}

/** Devuelve la sesión si el token es válido, está firmado con HS256 y no venció; si no, null. */
export async function verificarSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<Sesion>(token, clave(), { algorithms: ["HS256"] });
    return typeof payload.usuario === "string" ? payload : null;
  } catch {
    return null;
  }
}

/** Solo rutas internas: evita redirigir a otro dominio con ?next=//sitio.com */
export function destinoSeguro(next: unknown, porDefecto = "/demo") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : porDefecto;
}
