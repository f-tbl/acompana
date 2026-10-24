import { generateSpeech } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gatewayDisponible } from "@/server/ai";

const Body = z.object({ texto: z.string().min(1).max(400) });

/**
 * Algunos modelos (ej. Gemini TTS) devuelven PCM crudo (audio/L16), que el navegador no reproduce:
 * se le agrega el encabezado WAV. Los demás formatos pasan tal cual.
 */
function reproducible(pcm: Uint8Array, mediaType: string) {
  if (!/l16|pcm/i.test(mediaType)) return { bytes: pcm, mediaType };
  const rate = Number(/rate=(\d+)/i.exec(mediaType)?.[1] ?? 24000);
  const canales = Number(/channels=(\d+)/i.exec(mediaType)?.[1] ?? 1);
  const wav = new Uint8Array(44 + pcm.length);
  const v = new DataView(wav.buffer);
  const texto = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  texto(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, canales, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * canales * 2, true);
  v.setUint16(32, canales * 2, true);
  v.setUint16(34, 16, true);
  texto(36, "data");
  v.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  // L16 es big-endian; WAV espera little-endian.
  if (/l16/i.test(mediaType)) {
    for (let i = 44; i + 1 < wav.length; i += 2) [wav[i], wav[i + 1]] = [wav[i + 1], wav[i]];
  }
  return { bytes: wav, mediaType: "audio/wav" };
}

/** Voz natural para lo que dice el altavoz de la casa. Si falla, el cliente usa la voz del navegador. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  if (!gatewayDisponible()) return NextResponse.json({ error: "AI Gateway sin configurar" }, { status: 503 });

  try {
    const { audio } = await generateSpeech({
      model: process.env.AI_SPEECH_MODEL ?? "google/gemini-3.8-flash-lite-tts",
      voice: process.env.AI_SPEECH_VOICE ?? "Kore",
      text: body.data.texto,
      language: "es",
      outputFormat: "wav",
      instructions: "Hablá en español rioplatense, con voz cálida, tranquila y pausada, como una familiar que cuida.",
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const { bytes, mediaType } = reproducible(audio.uint8Array, audio.mediaType);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": mediaType, "Cache-Control": "private, max-age=86400" },
    });
  } catch (err) {
    console.error("generateSpeech", err);
    return NextResponse.json({ error: "No se pudo generar la voz" }, { status: 502 });
  }
}
