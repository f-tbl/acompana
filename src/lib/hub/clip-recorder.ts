// Buffer circular de video sin re-encodear: dos MediaRecorder que se reinician cada SEGMENT_MS,
// desfasados medio segmento. Al haber un incidente se toma el que lleva más tiempo grabando
// (así el clip incluye segundos previos), se deja grabar POST_MS más y se corta.
// El video nunca sale del navegador salvo este clip, y solo si hay alerta.

const SEGMENT_MS = 12_000;
const POST_MS = 4_000;

type Slot = { rec: MediaRecorder | null; chunks: Blob[]; inicio: number; reservado: boolean; timer?: ReturnType<typeof setTimeout> };

export function mimeSoportado() {
  const opciones = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return opciones.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export class ClipRecorder {
  private slots: Slot[] = [];
  private activo = false;
  readonly mime = mimeSoportado();

  constructor(private stream: MediaStream) {}

  get extension() {
    return this.mime.startsWith("video/mp4") ? "mp4" : "webm";
  }

  start() {
    if (!this.mime) return;
    this.activo = true;
    this.slots = [this.nuevoSlot(), this.nuevoSlot()];
    this.arrancar(this.slots[0]);
    this.slots[1].timer = setTimeout(() => this.arrancar(this.slots[1]), SEGMENT_MS / 2);
  }

  stop() {
    this.activo = false;
    for (const s of this.slots) {
      clearTimeout(s.timer);
      if (s.rec?.state === "recording") s.rec.stop();
    }
  }

  async capturar(): Promise<Blob | null> {
    const candidatos = this.slots.filter((s) => s.rec?.state === "recording" && !s.reservado);
    if (candidatos.length === 0) return null;
    const slot = candidatos.reduce((a, b) => (a.inicio < b.inicio ? a : b));
    slot.reservado = true;
    clearTimeout(slot.timer);
    await new Promise((r) => setTimeout(r, POST_MS));
    const blob = await this.detener(slot);
    slot.reservado = false;
    if (this.activo) this.arrancar(slot);
    return blob;
  }

  private nuevoSlot(): Slot {
    return { rec: null, chunks: [], inicio: 0, reservado: false };
  }

  private arrancar(slot: Slot) {
    if (!this.activo) return;
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(this.stream, { mimeType: this.mime, videoBitsPerSecond: 900_000 });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(1000);
    Object.assign(slot, { rec, chunks, inicio: performance.now() });
    slot.timer = setTimeout(() => {
      if (slot.reservado) return;
      rec.stop();
      this.arrancar(slot);
    }, SEGMENT_MS);
  }

  private detener(slot: Slot) {
    return new Promise<Blob>((resolve) => {
      const rec = slot.rec!;
      rec.onstop = () => resolve(new Blob(slot.chunks, { type: this.mime.split(";")[0] }));
      rec.stop();
    });
  }
}
