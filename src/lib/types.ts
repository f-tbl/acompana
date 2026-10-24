import type { Contact, Event, Home, Person } from "@/db/schema";

export type EventoConPersona = Event & { personName: string; personAvatar: string; clipUrl: string | null };

type ConFechas<T, K extends keyof T> = Omit<T, K> & { [P in K]: null extends T[P] ? string | null : string };

/** Lo que llega al cliente por JSON (las fechas viajan como string). */
export type EventoJson = ConFechas<EventoConPersona, "createdAt" | "updatedAt" | "resolvedAt">;

export type CasaJson = {
  home: ConFechas<Home, "hubLastSeen" | "createdAt">;
  persons: Person[];
  contacts: Contact[];
  hubOnline: boolean;
};

export type EventosJson = { activos: EventoJson[]; recientes: EventoJson[]; silencioHasta: string | null };
