import type { Respuesta } from "./score";

// Plan B sin LLM (o si la API falla): reglas por palabras clave.

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const AYUDA = /\b(ayuda|socorro|auxilio|me cai|me caigo|no puedo|llama|ambulancia|vengan)\b/;
const DOLOR = /\b(duele|dolor|me lastime|me golpe|sangr|me pegue|lastimad)/;
const BIEN = /\b(bien|tranquil|nada|no paso nada|todo ok|estoy ok|si estoy|me sente|no es nada)\b/;

export function clasificarRespuestaPorReglas(texto: string | null): { clasificacion: Respuesta; motivo: string } {
  if (!texto || !texto.trim()) return { clasificacion: "sin_respuesta", motivo: "No hubo respuesta en el tiempo de espera" };
  const t = norm(texto);
  if (DOLOR.test(t)) return { clasificacion: "dolor", motivo: "Menciona dolor o una lesión" };
  if (AYUDA.test(t)) return { clasificacion: "pide_ayuda", motivo: "Pide ayuda explícitamente" };
  if (BIEN.test(t) && !/\bno estoy bien\b/.test(t)) {
    return { clasificacion: "bien", motivo: "Dice que está bien" };
  }
  return { clasificacion: "confusa", motivo: "La respuesta no es clara" };
}

const PEDIDOS: [RegExp, string][] = [
  [/\b(sed|agua|tomar algo)\b/, "Tiene sed, pide agua"],
  [/\b(bano|pis|caca)\b/, "Quiere ir al baño"],
  [/\b(hambre|comer|comida)\b/, "Tiene hambre"],
  [/\b(frio)\b/, "Tiene frío"],
  [/\b(calor)\b/, "Tiene calor"],
  [/\b(duele|dolor)\b/, "Dice que le duele algo"],
  [/\b(miedo|solo|sola)\b/, "Tiene miedo o se siente sola/o"],
  [/\b(necesito|quiero|traeme|dame|podes)\b/, "Hizo un pedido"],
];

export function clasificarFrasePorReglas(texto: string) {
  const t = norm(texto);
  if (AYUDA.test(t)) {
    return { tipo: "ayuda" as const, resumen: `Pide ayuda: «${texto}»`, respuesta: "Ya mismo aviso. No estás solo, la ayuda está en camino." };
  }
  for (const [re, resumen] of PEDIDOS) {
    if (re.test(t)) {
      return { tipo: "pedido" as const, resumen, respuesta: "Listo, ya le avisé. Enseguida viene." };
    }
  }
  return { tipo: "charla" as const, resumen: "", respuesta: "" };
}
