import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const perfilEnum = pgEnum("perfil", ["dependiente", "nino"]);

export const tipoEventoEnum = pgEnum("tipo_evento", [
  "caida",
  "descenso_brusco",
  "inmovilidad",
  "salida",
  "grito",
  "pedido_ayuda",
  "boton_panico",
  "pedido",
]);

export const estadoEventoEnum = pgEnum("estado_evento", [
  "registrado", // nivel 1–3: solo historial + notificación
  "alerta", // alerta abierta, escalando
  "atendiendo", // un cuidador tomó el caso: se frena el escalamiento
  "cancelada", // falsa alarma
  "ambulancia", // el cuidador pidió ambulancia
  "emergencias", // el sistema escaló solo a emergencias
  "resuelta",
  "pendiente", // pedido del modo conversación
  "atendido",
]);

export const rolContactoEnum = pgEnum("rol_contacto", [
  "principal",
  "secundario",
  "vecino",
  "teleasistencia",
]);

export const homes = pgTable("homes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  hubLastSeen: timestamp("hub_last_seen", { withTimezone: true }),
  // Tras una falsa alarma, las detecciones automáticas se ignoran hasta este momento.
  silenceUntil: timestamp("silence_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Medicacion = { nombre: string; dosis: string; horario: string };
export type ContextoDiario = { medicacionTomada: boolean; durmioMal: boolean };

export const persons = pgTable("persons", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  perfil: perfilEnum("perfil").notNull(),
  avatar: text("avatar").notNull().default("🙂"),
  diagnoses: text("diagnoses").array().notNull().default([]),
  allergies: text("allergies").array().notNull().default([]),
  medications: jsonb("medications").$type<Medicacion[]>().notNull().default([]),
  bloodType: text("blood_type"),
  doctorName: text("doctor_name"),
  doctorPhone: text("doctor_phone"),
  advanceDirectives: text("advance_directives"),
  notes: text("notes"),
  // Protocolo de calma: frases con {lugar} y {hora}, dichas por el altavoz
  calmScript: jsonb("calm_script").$type<string[]>().notNull().default([]),
  context: jsonb("context")
    .$type<ContextoDiario>()
    .notNull()
    .default({ medicacionTomada: true, durmioMal: false }),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relation: text("relation").notNull(),
  phone: text("phone").notNull(),
  role: rolContactoEnum("role").notNull(),
  priority: integer("priority").notNull().default(0),
});

export type Notificacion = {
  at: string;
  contacto: string;
  rol: string;
  canal: "app" | "sms" | "llamada";
  mensaje: string;
};

export type Evaluacion = {
  clasificacion: string;
  motivo: string;
  fuente: "ia" | "reglas";
};

export type FactorPuntaje = { factor: string; puntos: number };

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homes.id, { onDelete: "cascade" }),
  personId: uuid("person_id")
    .notNull()
    .references(() => persons.id, { onDelete: "cascade" }),
  type: tipoEventoEnum("type").notNull(),
  room: text("room").notNull(),
  status: estadoEventoEnum("status").notNull(),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  responseText: text("response_text"),
  summary: text("summary"),
  assessment: jsonb("assessment").$type<Evaluacion>(),
  scoreBreakdown: jsonb("score_breakdown").$type<FactorPuntaje[]>().notNull().default([]),
  clipPath: text("clip_path"),
  fichaToken: text("ficha_token"),
  notifications: jsonb("notifications").$type<Notificacion[]>().notNull().default([]),
  escalationStep: integer("escalation_step").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const fichaLinks = pgTable("ficha_links", {
  token: text("token").primaryKey(),
  personId: uuid("person_id")
    .notNull()
    .references(() => persons.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Home = typeof homes.$inferSelect;
export type Person = typeof persons.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Event = typeof events.$inferSelect;
export type TipoEvento = (typeof tipoEventoEnum.enumValues)[number];
export type EstadoEvento = (typeof estadoEventoEnum.enumValues)[number];
