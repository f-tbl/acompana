const ANCHO = 360;
const ALTO = 150;
const MARGEN = { izq: 34, der: 12, arr: 10, abajo: 22 };

function duracion(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.round(s / 60)} min`;
}

/** Pulso de los últimos minutos, en SVG. */
export function GraficoPulso({ serie }: { serie: { ts: number; bpm: number }[] }) {
  if (serie.length < 2) {
    return <p className="flex h-24 items-center justify-center text-sm text-stone-500">Esperando lecturas…</p>;
  }

  const valores = serie.map((p) => p.bpm);
  let minimo = Math.floor((Math.min(...valores) - 5) / 10) * 10;
  let maximo = Math.ceil((Math.max(...valores) + 5) / 10) * 10;
  if (maximo - minimo < 30) {
    const centro = (maximo + minimo) / 2;
    minimo = Math.floor((centro - 15) / 10) * 10;
    maximo = minimo + 30;
  }

  const t0 = serie[0].ts;
  const t1 = serie[serie.length - 1].ts;
  const lapso = Math.max(1, t1 - t0);
  const x = (ts: number) => MARGEN.izq + ((ts - t0) / lapso) * (ANCHO - MARGEN.izq - MARGEN.der);
  const y = (bpm: number) => MARGEN.arr + (1 - (bpm - minimo) / (maximo - minimo)) * (ALTO - MARGEN.arr - MARGEN.abajo);
  const ultimo = serie[serie.length - 1];

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Pulso de los últimos ${duracion(lapso)}. Última lectura: ${ultimo.bpm} latidos por minuto.`}
    >
      {[minimo, (minimo + maximo) / 2, maximo].map((v) => (
        <g key={v}>
          <line x1={MARGEN.izq} x2={ANCHO - MARGEN.der} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
          <text x={MARGEN.izq - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#78716c">
            {v}
          </text>
        </g>
      ))}
      <polyline
        points={serie.map((p) => `${x(p.ts).toFixed(1)},${y(p.bpm).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#e11d48"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(ultimo.ts)} cy={y(ultimo.bpm)} r={4} fill="#e11d48" />
      <text x={MARGEN.izq} y={ALTO - 5} fontSize={11} fill="#78716c">
        hace {duracion(lapso)}
      </text>
      <text x={ANCHO - MARGEN.der} y={ALTO - 5} textAnchor="end" fontSize={11} fill="#78716c">
        ahora
      </text>
    </svg>
  );
}
