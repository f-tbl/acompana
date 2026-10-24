import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro, SESSION_COOKIE, verificarSesion } from "@/server/session";

// Todo el sistema requiere sesión, salvo la landing, el login y el paquete de emergencia
// (/ficha/[token]), que ya va protegido por su propio token temporal.
const PUBLICAS = [/^\/$/, /^\/login$/, /^\/ficha\/[^/]+$/];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sesion = await verificarSesion(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" && sesion) {
    return NextResponse.redirect(new URL(destinoSeguro(request.nextUrl.searchParams.get("next")), request.url));
  }
  if (sesion || PUBLICAS.some((r) => r.test(pathname))) return NextResponse.next();

  const res = pathname.startsWith("/api/")
    ? NextResponse.json({ error: "No autenticado" }, { status: 401 })
    : NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname + search)}`, request.url));
  // Si había un token vencido o adulterado, se borra.
  if (request.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos de Next y los de /public (cualquier ruta con extensión).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
