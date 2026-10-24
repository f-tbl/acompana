"use client";

import { useEffect, useState } from "react";

type Escena = {
  estado: "ok" | "caida" | "calma" | "llamada";
  bpm: number;
  spo2: number;
  puntaje: number;
  etiqueta: string;
  texto: string;
  alerta: boolean;
  globo: { quien: string; texto: string } | null;
  ms: number;
};

const ESCENAS: Escena[] = [
  { estado: "ok", bpm: 72, spo2: 98, puntaje: 1, etiqueta: "persona · de pie", texto: "Rosa está en el living. Todo en orden.", alerta: false, globo: null, ms: 3200 },
  { estado: "caida", bpm: 104, spo2: 97, puntaje: 8, etiqueta: "CAÍDA DETECTADA", texto: "Caída detectada. Gravedad 8 de 10.", alerta: true, globo: null, ms: 2200 },
  {
    estado: "calma",
    bpm: 112,
    spo2: 96,
    puntaje: 8,
    etiqueta: "en el piso · 0:12",
    texto: "Hablando con Rosa…",
    alerta: true,
    globo: { quien: "Altavoz del living", texto: "Rosa, ¿estás bien? ¿Pasó algo? Ya le estoy avisando a Laura." },
    ms: 3600,
  },
  {
    estado: "llamada",
    bpm: 115,
    spo2: 96,
    puntaje: 8,
    etiqueta: "en el piso · 0:31",
    texto: "Llamando a Laura (hija)… si no atiende, ambulancia.",
    alerta: true,
    globo: { quien: "Llamada saliente", texto: "Laura (hija) · sonando…" },
    ms: 3600,
  },
];

/** Simulación en loop del monitor de una cámara: Rosa se cae, la casa le habla y llama a Laura. */
export function MonitorCaida() {
  const [i, setI] = useState(0);
  const [hora, setHora] = useState("03:12:08");

  useEffect(() => {
    const t = setTimeout(() => setI((i + 1) % ESCENAS.length), ESCENAS[i].ms);
    return () => clearTimeout(t);
  }, [i]);

  useEffect(() => {
    const t = setInterval(() => setHora(new Date().toLocaleTimeString("es-AR", { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);

  const e = ESCENAS[i];
  const ultimo = ESCENAS[(i + ESCENAS.length - 1) % ESCENAS.length].globo;
  const globo = e.globo ?? ultimo;

  return (
    <figure className="monitor relative mx-auto w-full max-w-md">
      <figcaption className="sr-only">
        Simulación de ejemplo: Rosa se cae en el living. La cámara detecta la caída, el altavoz le pregunta si está bien y, como sigue en
        el piso, Acompañar llama a Laura, su hija.
      </figcaption>
      <span className="monitor-tag">Simulación de ejemplo</span>
      <div aria-hidden>
        <div className="monitor-bar">
          <span className="rec"><i />EN VIVO</span>
          <span className="tabular-nums">{hora}</span>
        </div>
        <div className="feed" data-estado={e.estado}>
          <svg className="room" viewBox="0 0 600 450">
            <path d="M0 330 L600 330" stroke="#2e5a52" strokeWidth="2" />
            <path d="M0 330 L120 270 L480 270 L600 330" fill="none" stroke="#244a43" strokeWidth="1.5" />
            <rect x="70" y="210" width="120" height="70" rx="10" fill="#1c3f39" stroke="#2a5049" />
            <rect x="62" y="190" width="136" height="30" rx="12" fill="#22473f" stroke="#2e5a52" />
            <rect x="420" y="120" width="90" height="70" rx="4" fill="none" stroke="#2a5049" strokeWidth="2" />
            <path d="M465 120 V190 M420 155 H510" stroke="#244a43" />
            <rect x="400" y="250" width="110" height="10" rx="3" fill="#22473f" />
            <path d="M415 260 V330 M495 260 V330" stroke="#22473f" strokeWidth="5" />
            <g className="persona">
              <circle cx="300" cy="148" r="22" fill="#d5e6de" />
              <rect x="280" y="175" width="40" height="88" rx="18" fill="#d5e6de" />
              <rect x="283" y="252" width="14" height="78" rx="7" fill="#b7cfc5" />
              <rect x="303" y="252" width="14" height="78" rx="7" fill="#b7cfc5" />
              <rect x="266" y="182" width="12" height="66" rx="6" fill="#c4d9d0" />
              <rect x="322" y="182" width="12" height="66" rx="6" fill="#c4d9d0" />
            </g>
          </svg>
          <div className="scan" />
          <i className="corner c-tl" /><i className="corner c-tr" /><i className="corner c-bl" /><i className="corner c-br" />
          <span className="cam-label">CAM 02 · LIVING</span>
          <div className="bbox"><span>{e.etiqueta}</span></div>
          <div className={`globo ${e.globo ? "ver" : ""}`}>
            <small>{globo?.quien}</small>
            {globo?.texto}
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Lectura etiqueta="Pulso" valor={e.bpm} unidad="lpm" alerta={e.bpm > 100} />
          <Lectura etiqueta="Oxígeno" valor={e.spo2} unidad="%" />
          <Lectura etiqueta="Gravedad" valor={e.puntaje} unidad="/10" alerta={e.puntaje >= 7} />
        </div>
        <div className={`estado ${e.alerta ? "alerta" : ""}`}>
          <span className="punto" />
          {e.texto}
        </div>
      </div>
    </figure>
  );
}

function Lectura({ etiqueta, valor, unidad, alerta = false }: { etiqueta: string; valor: number; unidad: string; alerta?: boolean }) {
  return (
    <div className="lectura">
      <span className="lectura-label">{etiqueta}</span>
      <span className={`lectura-val ${alerta ? "text-[#ffb4a0]" : ""}`}>
        {valor}
        <small>{unidad}</small>
      </span>
    </div>
  );
}
