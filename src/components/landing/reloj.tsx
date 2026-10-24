/** Reloj de ejemplo con pulso y oxígeno de Rosa. Solo CSS: el corazón late y el electro se dibuja en loop. */
export function Reloj() {
  return (
    <figure className="reloj-escena">
      <figcaption className="sr-only">Ejemplo de reloj: pulso de 118 en reposo, oxígeno 97%, sin caída.</figcaption>
      <div aria-hidden className="reloj">
        <div className="correa arriba" />
        <div className="correa abajo" />
        <div className="caja">
          <span className="corona" />
          <div className="flex justify-between font-mono text-[11px] text-white/55">
            <span>ROSA</span>
            <span>03:12</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 font-mono text-[64px] leading-none font-semibold tracking-tight">
              <span className="corazon">♥</span>
              118
              <small className="text-[13px] font-medium text-[#ff8f78]">▲ en reposo</small>
            </div>
            <svg className="ecg" viewBox="0 0 300 48" preserveAspectRatio="none">
              <path
                d="M0 26 H40 L48 26 L54 8 L62 44 L70 26 H110 L118 26 L124 6 L132 44 L140 26 H180 L188 26 L194 8 L202 44 L210 26 H250 L258 26 L264 6 L272 44 L280 26 H300"
                fill="none"
                stroke="#e0533f"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex justify-between font-mono text-[13px]">
            <span>SpO₂ <b className="font-semibold text-salvia">97%</b></span>
            <span>caída <b className="font-semibold text-salvia">no</b></span>
          </div>
        </div>
      </div>
    </figure>
  );
}
