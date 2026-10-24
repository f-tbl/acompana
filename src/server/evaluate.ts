import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Evaluacion, Person, TipoEvento } from "@/db/schema";
import { clasificarFrasePorReglas, clasificarRespuestaPorReglas } from "@/lib/heuristics";
import { NOMBRE_EVENTO, type Respuesta } from "@/lib/score";
import { gatewayDisponible } from "./ai";

// AI SDK + Vercel AI Gateway: el modelo se nombra "proveedor/modelo" y se paga con la cuenta de Vercel.
const MODEL = process.env.AI_MODEL ?? "google/gemini-3.8-flash";

const opcionesComunes = {
  model: MODEL,
  reasoning: "low" as const, // la respuesta tiene que salir rápido: la persona está esperando
  maxRetries: 1,
};

function describirPersona(p: Person) {
  const perfil = p.perfil === "nino" ? `niño/a de ${p.age} años` : `persona dependiente de ${p.age} años`;
  const dx = p.diagnoses.length ? ` Diagnósticos: ${p.diagnoses.join(", ")}.` : "";
  return `${p.name}, ${perfil}.${dx}`;
}

const RespuestaSchema = z.object({
  clasificacion: z.enum(["bien", "pide_ayuda", "dolor", "confusa"]),
  motivo: z.string().describe("Explicación breve para el cuidador, máximo 20 palabras"),
});

export async function evaluarRespuesta(args: {
  persona: Person;
  tipo: TipoEvento;
  texto: string | null;
}): Promise<{ clasificacion: Respuesta; evaluacion: Evaluacion }> {
  const { persona, tipo, texto } = args;
  if (!texto?.trim()) {
    const r = clasificarRespuestaPorReglas(null);
    return { clasificacion: r.clasificacion, evaluacion: { ...r, fuente: "reglas" } };
  }

  if (gatewayDisponible()) {
    try {
      const { output } = await generateText({
        ...opcionesComunes,
        abortSignal: AbortSignal.timeout(8_000),
        output: Output.object({ schema: RespuestaSchema }),
        system:
          "Sos el módulo de evaluación de un sistema de cuidado en el hogar. Tras detectar un evento, " +
          "el altavoz le preguntó a la persona «¿Estás bien? ¿Pasó algo?». Clasificá su respuesta:\n" +
          "- bien: responde con coherencia que está bien.\n" +
          "- pide_ayuda: pide ayuda o que venga alguien.\n" +
          "- dolor: dice que se lastimó, le duele algo o no puede levantarse.\n" +
          "- confusa: incoherente, desorientada o sin relación con la pregunta.\n" +
          "Ante la duda entre «bien» y otra categoría, elegí la otra: es más seguro.",
        prompt: `Persona: ${describirPersona(persona)}\nEvento: ${NOMBRE_EVENTO[tipo]}\nRespuesta transcripta: «${texto}»`,
      });
      return { clasificacion: output.clasificacion, evaluacion: { ...output, fuente: "ia" } };
    } catch (err) {
      console.error("evaluarRespuesta: uso reglas", err);
    }
  }

  const r = clasificarRespuestaPorReglas(texto);
  return { clasificacion: r.clasificacion, evaluacion: { ...r, fuente: "reglas" } };
}

const FraseSchema = z.object({
  tipo: z
    .enum(["pedido", "ayuda", "charla"])
    .describe("pedido: necesita algo; ayuda: emergencia, dolor fuerte, caída o miedo intenso; charla: nada que avisar"),
  resumen: z.string().describe("Para el celular del cuidador, ej. «Tiene sed, pide agua». Vacío si es charla"),
  respuesta: z.string().describe("Frase corta y cálida que dice el altavoz a la persona. Vacía si es charla"),
});

export async function interpretarFrase(args: { persona: Person; texto: string }) {
  const { persona, texto } = args;
  if (gatewayDisponible()) {
    try {
      const { output } = await generateText({
        ...opcionesComunes,
        abortSignal: AbortSignal.timeout(8_000),
        output: Output.object({ schema: FraseSchema }),
        system:
          "Sos la voz de un sistema de cuidado en el hogar. La persona te habla por un micrófono del ambiente. " +
          "Decidí si hay que avisarle al adulto responsable y qué contestarle. Hablá en español rioplatense, " +
          "con frases cortas y simples. Con niños usá lenguaje muy simple. Con personas con demencia usá la " +
          "técnica de validación: no contradigas, tranquilizá y redirigí. Nunca prometas algo que el sistema no " +
          "puede hacer: solo avisás al cuidador.",
        prompt: `Persona: ${describirPersona(persona)}\nDijo: «${texto}»`,
      });
      return { ...output, fuente: "ia" as const };
    } catch (err) {
      console.error("interpretarFrase: uso reglas", err);
    }
  }
  return { ...clasificarFrasePorReglas(texto), fuente: "reglas" as const };
}
