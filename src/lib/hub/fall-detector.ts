import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Heurística simple sobre los 33 puntos de MediaPipe Pose (coordenadas normalizadas, y crece hacia abajo):
// 1. La cadera baja de golpe (más de DROP en menos de DROP_WINDOW_MS) → candidato.
// 2. Se observa OBSERVE_MS: si el torso queda horizontal (o la persona sale de cuadro) es caída;
//    si queda vertical es un movimiento brusco (ej. sentarse de golpe).

const DROP = 0.17;
const DROP_WINDOW_MS = 900;
const OBSERVE_MS = 1500;
const HORIZONTAL_DEG = 55;
const COOLDOWN_MS = 20_000;

export type Deteccion = "caida" | "descenso_brusco";

export type EstadoPose = {
  visible: boolean;
  anguloTorso: number; // 0 = vertical, 90 = acostado
  caderaY: number;
  fase: "normal" | "observando" | "pausa";
};

const avg = (a: NormalizedLandmark, b: NormalizedLandmark) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export class FallDetector {
  private hist: { t: number; y: number }[] = [];
  private observando: { desde: number; angulos: number[]; perdidos: number } | null = null;
  private pausaHasta = 0;

  update(lm: NormalizedLandmark[] | undefined, t: number): { estado: EstadoPose; deteccion?: Deteccion } {
    const visible = !!lm && lm.length >= 25 && (lm[23].visibility ?? 1) > 0.3 && (lm[11].visibility ?? 1) > 0.3;
    let angulo = 0;
    let caderaY = 0;

    if (visible) {
      const hombros = avg(lm[11], lm[12]);
      const cadera = avg(lm[23], lm[24]);
      caderaY = cadera.y;
      angulo = (Math.atan2(Math.abs(hombros.x - cadera.x), Math.abs(hombros.y - cadera.y)) * 180) / Math.PI;
      this.hist.push({ t, y: caderaY });
      this.hist = this.hist.filter((h) => t - h.t <= DROP_WINDOW_MS);
    }

    const fase: EstadoPose["fase"] = t < this.pausaHasta ? "pausa" : this.observando ? "observando" : "normal";
    const estado: EstadoPose = { visible, anguloTorso: angulo, caderaY, fase };
    if (fase === "pausa") return { estado };

    if (this.observando) {
      if (visible) this.observando.angulos.push(angulo);
      else this.observando.perdidos++;
      if (t - this.observando.desde < OBSERVE_MS) return { estado };

      const { angulos, perdidos } = this.observando;
      const medio = angulos.length ? angulos.reduce((a, b) => a + b, 0) / angulos.length : 90;
      const deteccion: Deteccion = medio > HORIZONTAL_DEG || perdidos > angulos.length ? "caida" : "descenso_brusco";
      this.reiniciar(t);
      return { estado, deteccion };
    }

    if (visible && this.hist.length > 2) {
      const minY = Math.min(...this.hist.map((h) => h.y));
      if (caderaY - minY > DROP) {
        this.observando = { desde: t, angulos: [], perdidos: 0 };
        estado.fase = "observando";
      }
    }
    return { estado };
  }

  /** Para eventos simulados: evita que la detección real dispare otro encima. */
  reiniciar(t: number) {
    this.observando = null;
    this.hist = [];
    this.pausaHasta = t + COOLDOWN_MS;
  }
}
