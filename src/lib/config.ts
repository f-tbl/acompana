// Tiempos cortos para el demo; en producción serían minutos.
export const ESCALATION_SECONDS = Number(process.env.NEXT_PUBLIC_ESCALATION_SECONDS ?? 60);
export const COUNTDOWN_SECONDS = Number(process.env.NEXT_PUBLIC_COUNTDOWN_SECONDS ?? 60);
export const ANSWER_TIMEOUT_MS = 15_000;
export const HUB_OFFLINE_AFTER_MS = 45_000;
export const FALSE_ALARM_SILENCE_SECONDS = Number(process.env.NEXT_PUBLIC_FALSE_ALARM_SILENCE_SECONDS ?? 60);
export const HOME_TIMEZONE = process.env.NEXT_PUBLIC_HOME_TIMEZONE ?? "America/Argentina/Buenos_Aires";
export const CLIPS_BUCKET = "clips";
export const FICHA_LINK_HOURS = 6;
