import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HOME_TIMEZONE } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function haceCuanto(iso: string | Date, ahora = Date.now()) {
  const s = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-AR");
}

export function horaCorta(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

// En Vercel el servidor corre en UTC: las fechas se muestran en la zona horaria de la casa.

export function fechaCasa(d: Date) {
  return d.toLocaleString("es-AR", { timeZone: HOME_TIMEZONE, dateStyle: "short", timeStyle: "short" });
}

export function diaCasa(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: HOME_TIMEZONE });
}
