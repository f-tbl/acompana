// Protocolo de calma por voz (fase MVP: TTS con frases cargadas por la familia).
// Fase 2: audios pregrabados con la voz del familiar.

export function frasesDeCalma(script: string[], lugar: string, fecha = new Date()) {
  const hora = fecha.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" });
  return script.map((f) => f.replaceAll("{lugar}", lugar.toLowerCase()).replaceAll("{hora}", hora));
}

export const AMBIENTES = [
  { nombre: "Living", camara: true },
  { nombre: "Cocina", camara: true },
  { nombre: "Pasillo", camara: true },
  { nombre: "Entrada", camara: true },
  // Privacidad: en baño y dormitorio nunca hay cámara, solo micrófono y altavoz.
  { nombre: "Baño", camara: false },
  { nombre: "Dormitorio", camara: false },
] as const;
