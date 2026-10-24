// Voz con la Web Speech API del navegador (anda bien en Chrome/Edge).
// Un solo reconocedor con dos modos: "ambiente" (modo conversación, escucha siempre)
// y "pregunta" (espera la respuesta a «¿Estás bien?» con timeout).

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const LANG = "es-AR";

export function reconocimientoDisponible() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function elegirVoz() {
  const voces = speechSynthesis.getVoices();
  return (
    voces.find((v) => v.lang === "es-AR") ??
    voces.find((v) => v.lang.startsWith("es") && /google/i.test(v.name)) ??
    voces.find((v) => v.lang.startsWith("es"))
  );
}

export class Voz {
  private rec: SpeechRecognitionLike | null = null;
  private modo: "apagado" | "ambiente" | "pregunta" = "apagado";
  private hablando = false;
  private corriendo = false;
  private resolverPregunta: ((t: string | null) => void) | null = null;
  escuchaAmbiente = true;

  constructor(
    private onFrase: (texto: string) => void,
    private onEscucha?: (parcial: string, modo: string) => void,
  ) {
    const Ctor = typeof window !== "undefined" ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = LANG;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const texto = r[0].transcript.trim();
        this.onEscucha?.(texto, this.modo);
        if (!r.isFinal || !texto) continue;
        this.entregar(texto);
      }
    };
    rec.onend = () => {
      this.corriendo = false;
      this.asegurar();
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") console.warn("SpeechRecognition:", e.error);
    };
    this.rec = rec;
  }

  get disponible() {
    return !!this.rec;
  }

  iniciar() {
    this.modo = "ambiente";
    this.asegurar();
  }

  detener() {
    this.modo = "apagado";
    this.rec?.abort();
  }

  /** También sirve para el campo de texto «simular voz» del demo. */
  entregar(texto: string) {
    if (this.modo === "pregunta" && this.resolverPregunta) {
      const r = this.resolverPregunta;
      this.resolverPregunta = null;
      this.modo = "ambiente";
      r(texto);
    } else if (this.modo === "ambiente" && this.escuchaAmbiente && !this.hablando) {
      this.onFrase(texto);
    }
  }

  async decir(texto: string) {
    this.hablando = true;
    this.rec?.abort(); // que no se escuche a sí mismo
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = LANG;
      const voz = elegirVoz();
      if (voz) u.voice = voz;
      u.rate = 0.95;
      const fin = () => resolve();
      u.onend = fin;
      u.onerror = fin;
      setTimeout(fin, 2000 + texto.length * 90); // por si el navegador no dispara onend
      speechSynthesis.speak(u);
    });
    this.hablando = false;
    this.asegurar();
  }

  preguntar(timeoutMs: number) {
    return new Promise<string | null>((resolve) => {
      this.modo = "pregunta";
      this.resolverPregunta = resolve;
      this.asegurar();
      setTimeout(() => {
        if (this.resolverPregunta === resolve) {
          this.resolverPregunta = null;
          this.modo = "ambiente";
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  private asegurar() {
    if (!this.rec || this.corriendo || this.hablando || this.modo === "apagado") return;
    try {
      this.rec.start();
      this.corriendo = true;
    } catch {
      // ya estaba arrancando
    }
  }
}

/** Desbloquea el audio (los navegadores exigen un gesto del usuario antes de reproducir). */
export function desbloquearAudio() {
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
  speechSynthesis.getVoices();
}
