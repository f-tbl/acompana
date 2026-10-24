"use client";

import type { PoseLandmarker as PoseLandmarkerT } from "@mediapipe/tasks-vision";
import { Brain, Camera, CameraOff, Ear, EarOff, Mic, Play, Send, Sparkles, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Person, TipoEvento } from "@/db/schema";
import { AMBIENTES, frasesDeCalma } from "@/lib/calm";
import { ANSWER_TIMEOUT_MS, FALSE_ALARM_SILENCE_SECONDS } from "@/lib/config";
import { ClipRecorder } from "@/lib/hub/clip-recorder";
import { FallDetector, type EstadoPose } from "@/lib/hub/fall-detector";
import { desbloquearAudio, precargarVoz, Voz } from "@/lib/hub/voice";
import { api, avisarCambio, subirClip, useEnVivo } from "@/lib/live";
import { DETECCIONES_AUTOMATICAS, NOMBRE_EVENTO, NOMBRE_RESPUESTA, type Respuesta } from "@/lib/score";
import type { CasaJson, EventoJson, EventosJson } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type Fase = "inactivo" | "vigilando" | "preguntando" | "evaluando" | "calmando";
/** Lo que escuchó el reconocimiento de voz y cómo lo interpretó el sistema. */
type Entendido = {
  contexto: string;
  escuche: string | null;
  entendi: string | null; // null mientras se evalúa
  detalle?: string;
  fuente?: "ia" | "reglas";
  tono: "ok" | "alerta" | "info";
};
type Linea = { id: number; quien: "sistema" | "persona" | "info" | "error"; texto: string; hora: string };

const SIMULACIONES: { tipo: TipoEvento; label: string }[] = [
  { tipo: "caida", label: "Caída" },
  { tipo: "descenso_brusco", label: "Sentarse de golpe" },
  { tipo: "inmovilidad", label: "Inmovilidad" },
  { tipo: "salida", label: "Salida de casa" },
  { tipo: "grito", label: "Grito" },
  { tipo: "boton_panico", label: "Botón de pánico" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Hub() {
  const [casa, setCasa] = useState<CasaJson | null>(null);
  const [personId, setPersonId] = useState<string>("");
  const [ambiente, setAmbiente] = useState<string>("Living");
  const [fase, setFase] = useState<Fase>("inactivo");
  const [log, setLog] = useState<Linea[]>([]);
  const [parcial, setParcial] = useState("");
  const [pose, setPose] = useState<EstadoPose | null>(null);
  const [modelo, setModelo] = useState<"cargando" | "listo" | "error" | null>(null);
  const [escucha, setEscucha] = useState(true);
  const [vozIa, setVozIa] = useState(true);
  const [fuenteVoz, setFuenteVoz] = useState<"ia" | "navegador" | null>(null);
  const [entendido, setEntendido] = useState<Entendido | null>(null);
  const [texto, setTexto] = useState("");
  const [silencioHasta, setSilencioHasta] = useState(0);
  const [ahora, setAhora] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseLandmarkerT | null>(null);
  const detectorRef = useRef(new FallDetector());
  const recorderRef = useRef<ClipRecorder | null>(null);
  const vozRef = useRef<Voz | null>(null);
  const ocupadoRef = useRef(false);
  const calmandoRef = useRef<string | null>(null);
  const seguidosRef = useRef(new Map<string, EventoJson["status"]>());
  const silencioRef = useRef(0); // ms epoch: hasta cuándo se ignoran las detecciones automáticas
  const lineaId = useRef(0);

  // Refs con el último valor para usar dentro de callbacks de larga vida (rAF, voz).
  const estadoRef = useRef({ casa, personId, ambiente });
  useEffect(() => {
    estadoRef.current = { casa, personId, ambiente };
  });

  const camaraPermitida = AMBIENTES.find((a) => a.nombre === ambiente)?.camara ?? true;
  const persona = casa?.persons.find((p) => p.id === personId);

  const anotar = useCallback((quien: Linea["quien"], texto: string) => {
    const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog((l) => [{ id: ++lineaId.current, quien, texto, hora }, ...l].slice(0, 60));
  }, []);

  const decir = useCallback(
    async (t: string) => {
      anotar("sistema", t);
      await vozRef.current?.decir(t);
      setFuenteVoz(vozRef.current?.ultimaFuente ?? null);
    },
    [anotar],
  );

  useEffect(() => {
    api<CasaJson>("/api/casa")
      .then((c) => {
        setCasa(c);
        setPersonId((id) => id || c.persons[0]?.id || "");
      })
      .catch((e) => anotar("error", `No se pudo cargar la casa: ${e.message}`));
  }, [anotar]);

  const principal = () => estadoRef.current.casa?.contacts.find((c) => c.role === "principal")?.name ?? "tu familia";
  const personaActual = (): Person | undefined =>
    estadoRef.current.casa?.persons.find((p) => p.id === estadoRef.current.personId);

  const calmar = useCallback(
    async (eventId: string) => {
      const p = personaActual();
      if (!p || calmandoRef.current === eventId) return;
      calmandoRef.current = eventId;
      setFase("calmando");
      // Dos vueltas del protocolo, en paralelo a las alertas; se corta si el incidente se cierra.
      for (let vuelta = 0; vuelta < 2; vuelta++) {
        for (const frase of frasesDeCalma(p.calmScript, estadoRef.current.ambiente)) {
          if (calmandoRef.current !== eventId) return;
          await decir(frase);
          await sleep(2500);
        }
      }
      if (calmandoRef.current === eventId) {
        calmandoRef.current = null;
        setFase("vigilando");
      }
    },
    [decir],
  );

  const manejarIncidente = useCallback(
    async (tipo: TipoEvento, simulado = false) => {
      const p = personaActual();
      if (!p || ocupadoRef.current) return;
      const restante = Math.ceil((silencioRef.current - Date.now()) / 1000);
      if (DETECCIONES_AUTOMATICAS.includes(tipo) && restante > 0) {
        detectorRef.current.reiniciar(performance.now());
        anotar("info", `${NOMBRE_EVENTO[tipo]} ignorado: pausa por falsa alarma (quedan ${restante} s)`);
        return;
      }
      ocupadoRef.current = true;
      detectorRef.current.reiniciar(performance.now());
      anotar("info", `${simulado ? "Simulado" : "Detectado"}: ${NOMBRE_EVENTO[tipo]} en ${estadoRef.current.ambiente}`);
      setFase("preguntando");

      const clip = recorderRef.current?.capturar() ?? Promise.resolve(null);
      try {
        await decir(`${p.name}, ¿estás bien? ¿Pasó algo?`);
        const respuesta = (await vozRef.current?.preguntar(ANSWER_TIMEOUT_MS)) ?? null;
        anotar(respuesta ? "persona" : "info", respuesta ?? `Sin respuesta en ${ANSWER_TIMEOUT_MS / 1000} s`);
        setEntendido({ contexto: "Respuesta a «¿Estás bien?»", escuche: respuesta, entendi: null, tono: "info" });
        setFase("evaluando");

        const { event, upload } = await api<{
          event: EventoJson | null;
          upload: { path: string; token: string } | null;
        }>(
          "/api/incidentes",
          {
            personId: p.id,
            tipo,
            room: estadoRef.current.ambiente,
            texto: respuesta,
            clipExt: recorderRef.current?.extension,
          },
        );
        if (!event) {
          anotar("info", "Ignorado: la detección automática está en pausa por una falsa alarma");
          await decir("Perdón, me confundí. Sigo atento.");
          return;
        }
        seguidosRef.current.set(event.id, event.status);
        const clasificacion = (event.assessment?.clasificacion ?? "sin_respuesta") as Respuesta;
        setEntendido({
          contexto: "Respuesta a «¿Estás bien?»",
          escuche: respuesta,
          entendi: NOMBRE_RESPUESTA[clasificacion],
          detalle: `${event.assessment?.motivo ?? ""} · puntaje ${event.score}/10`,
          fuente: event.assessment?.fuente,
          tono: clasificacion === "bien" ? "ok" : "alerta",
        });
        anotar("info", `Puntaje ${event.score}/10 (nivel ${event.level}) · ${event.assessment?.motivo ?? ""}`);
        avisarCambio();

        if (event.level === 1) {
          await decir("Bueno, me quedo tranquilo. Si necesitás algo, decímelo.");
          return; // el clip se descarta: sin alerta, el video no sale de la casa
        }

        void clip.then(async (blob) => {
          if (!blob || !upload) return;
          if (await subirClip(upload.path, upload.token, blob)) {
            await api(`/api/eventos/${event.id}/clip`, { path: upload.path });
            anotar("info", `Video del incidente enviado (${Math.round(blob.size / 1024)} KB)`);
            avisarCambio();
          }
        });
        await decir(`Ya le avisé a ${principal()}. Ya viene ayuda.`);
        void calmar(event.id);
      } catch (e) {
        anotar("error", (e as Error).message);
      } finally {
        ocupadoRef.current = false;
        setFase((f) => (f === "calmando" ? f : "vigilando"));
      }
    },
    [anotar, decir, calmar],
  );

  const onFrase = useCallback(
    async (t: string) => {
      const p = personaActual();
      if (!p || t.length < 3 || ocupadoRef.current) return;
      anotar("persona", t);
      setEntendido({ contexto: "Le habló al sistema", escuche: t, entendi: null, tono: "info" });
      try {
        const res = await api<{
          tipo: "pedido" | "ayuda" | "charla";
          respuesta: string;
          resumen: string;
          fuente: "ia" | "reglas";
          event: EventoJson | null;
        }>(
          "/api/hablar",
          { personId: p.id, room: estadoRef.current.ambiente, texto: t },
        );
        setEntendido({
          contexto: "Le habló al sistema",
          escuche: t,
          entendi:
            res.tipo === "pedido" ? `Pedido: ${res.resumen}` : res.tipo === "ayuda" ? `Pide ayuda: ${res.resumen}` : "Charla, no hace falta avisar",
          detalle: res.event ? "Se avisó al celular del cuidador" : undefined,
          fuente: res.fuente,
          tono: res.tipo === "ayuda" ? "alerta" : res.tipo === "pedido" ? "ok" : "info",
        });
        if (!res.event) return anotar("info", "Charla: no hace falta avisar");
        seguidosRef.current.set(res.event.id, res.event.status);
        anotar("info", `Aviso al celular: ${res.resumen}`);
        avisarCambio();
        await decir(res.respuesta);
        if (res.event.level >= 2) void calmar(res.event.id);
      } catch (e) {
        anotar("error", (e as Error).message);
      }
    },
    [anotar, decir, calmar],
  );

  // Reacciona a lo que hace el cuidador desde su celular.
  const sincronizar = useCallback(async () => {
    if (fase === "inactivo") return;
    try {
      const { cambios } = await api<{ cambios: number }>("/api/escalar", {});
      if (cambios) avisarCambio();
      const { activos, recientes, silencioHasta } = await api<EventosJson>("/api/eventos?limit=20");
      silencioRef.current = silencioHasta ? Date.parse(silencioHasta) : 0;
      setSilencioHasta(silencioRef.current);
      const todos = new Map([...recientes, ...activos].map((e) => [e.id, e]));
      for (const [id, anterior] of seguidosRef.current) {
        const e = todos.get(id);
        if (!e || e.status === anterior) continue;
        seguidosRef.current.set(id, e.status);
        if (e.status === "cancelada" || e.status === "resuelta") {
          if (calmandoRef.current === id) calmandoRef.current = null;
          setFase((f) => (f === "calmando" ? "vigilando" : f));
          anotar(
            "info",
            e.status === "cancelada"
              ? `El cuidador lo marcó como falsa alarma: detección automática en pausa ${FALSE_ALARM_SILENCE_SECONDS} s`
              : "Incidente resuelto",
          );
        } else if (e.status === "atendiendo") {
          void decir(`${principal()} ya vio el aviso y se está ocupando.`);
        } else if (e.status === "ambulancia" || e.status === "emergencias") {
          void decir("Ya pedimos una ambulancia, está en camino. Todo va a estar bien.");
        } else if (e.status === "atendido") {
          void decir(`${principal()} ya vio tu pedido y viene enseguida.`);
        }
      }
    } catch {
      // el polling reintenta solo
    }
  }, [fase, anotar, decir]);
  useEnVivo(sincronizar);

  useEffect(() => {
    if (fase === "inactivo") return;
    const latido = () => api("/api/latido", {}).catch(() => {});
    latido();
    const t = setInterval(latido, 15_000);
    return () => clearInterval(t);
  }, [fase]);

  // Privacidad: en baño y dormitorio se apaga la cámara y no se graba nada.
  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = camaraPermitida));
    if (camaraPermitida) recorderRef.current?.start();
    else recorderRef.current?.stop();
  }, [camaraPermitida, fase === "inactivo"]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!silencioHasta) return;
    const tick = () => setAhora(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [silencioHasta]);

  useEffect(() => {
    if (vozRef.current) vozRef.current.escuchaAmbiente = escucha;
  }, [escucha]);

  useEffect(() => {
    if (vozRef.current) vozRef.current.vozNatural = vozIa;
  }, [vozIa]);

  // Precarga la voz de las frases fijas para que la pregunta salga sin demora.
  useEffect(() => {
    if (fase === "inactivo" || !persona || !vozIa) return;
    const contacto = casa?.contacts.find((c) => c.role === "principal")?.name ?? "tu familia";
    for (const f of [
      `${persona.name}, ¿estás bien? ¿Pasó algo?`,
      "Bueno, me quedo tranquilo. Si necesitás algo, decímelo.",
      `Ya le avisé a ${contacto}. Ya viene ayuda.`,
    ]) {
      void precargarVoz(f);
    }
  }, [fase === "inactivo", persona, casa, vozIa]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFraseRef = useRef(onFrase);
  const incidenteRef = useRef(manejarIncidente);
  useEffect(() => {
    onFraseRef.current = onFrase;
    incidenteRef.current = manejarIncidente;
  });

  async function iniciar() {
    desbloquearAudio();
    setFase("vigilando");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      recorderRef.current = new ClipRecorder(stream);
      if (camaraPermitida) recorderRef.current.start();
    } catch (e) {
      anotar("error", `Sin cámara/micrófono: ${(e as Error).message}. Podés usar los botones de simulación.`);
    }

    const voz = new Voz(
      (t) => void onFraseRef.current(t),
      (t) => setParcial(t),
    );
    vozRef.current = voz;
    voz.escuchaAmbiente = escucha;
    voz.vozNatural = vozIa;
    voz.iniciar();
    if (!voz.disponible) anotar("error", "Este navegador no reconoce voz: usá Chrome, o escribí las respuestas abajo.");

    if (streamRef.current) void cargarModelo();
    anotar("info", "Sistema iniciado");
  }

  async function cargarModelo() {
    setModelo("cargando");
    try {
      const { FilesetResolver, PoseLandmarker, DrawingUtils } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      poseRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      setModelo("listo");

      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const dibujo = new DrawingUtils(ctx);
      let ultimoFrame = -1;
      let ultimoEstado = 0;

      const loop = () => {
        requestAnimationFrame(loop);
        const camara = AMBIENTES.find((a) => a.nombre === estadoRef.current.ambiente)?.camara ?? true;
        if (!camara || video.readyState < 2 || video.currentTime === ultimoFrame) return;
        ultimoFrame = video.currentTime;
        const ahora = performance.now();
        const res = poseRef.current!.detectForVideo(video, ahora);
        const lm = res.landmarks[0];

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (lm) {
          dibujo.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: "#5eead4", lineWidth: 3 });
          dibujo.drawLandmarks(lm, { color: "#f0fdfa", radius: 2 });
        }
        const { estado, deteccion } = detectorRef.current.update(lm, ahora);
        if (ahora - ultimoEstado > 200) {
          setPose(estado);
          ultimoEstado = ahora;
        }
        if (deteccion && !ocupadoRef.current) void incidenteRef.current(deteccion);
      };
      loop();
    } catch (e) {
      setModelo("error");
      anotar("error", `No cargó MediaPipe: ${(e as Error).message}`);
    }
  }

  function enviarTexto(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    const voz = vozRef.current;
    if (voz) voz.entregar(t);
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-teal-400/15 text-teal-300">
            <Volume2 className="size-4" />
          </span>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Equipo de la casa</h1>
            <p className="text-xs text-slate-400">Cámara, micrófono y altavoz · el video se procesa acá</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5"
            aria-label="Persona"
          >
            {casa?.persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.avatar} {p.name} ({p.perfil === "nino" ? `${p.age} años` : "dependiente"})
              </option>
            ))}
          </select>
          <select
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5"
            aria-label="Ambiente"
          >
            {AMBIENTES.map((a) => (
              <option key={a.nombre} value={a.nombre}>
                {a.nombre}
                {a.camara ? "" : " (sin cámara)"}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black">
            <video ref={videoRef} muted playsInline className={cn("size-full -scale-x-100 object-cover", !camaraPermitida && "invisible")} />
            <canvas ref={canvasRef} className={cn("pointer-events-none absolute inset-0 size-full -scale-x-100 object-cover", !camaraPermitida && "invisible")} />

            {fase === "inactivo" && (
              <div className="absolute inset-0 grid place-items-center bg-slate-950/80 p-6 text-center">
                <div className="max-w-sm space-y-4">
                  <p className="text-slate-300">
                    Este dispositivo hace de cámara, micrófono y altavoz de la casa. Necesita permiso para usarlos.
                  </p>
                  <button
                    onClick={iniciar}
                    disabled={!casa}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-50"
                  >
                    <Play className="size-4" /> Iniciar sistema
                  </button>
                </div>
              </div>
            )}

            {fase !== "inactivo" && !camaraPermitida && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-400">
                <div className="space-y-2">
                  <CameraOff className="mx-auto size-8" />
                  <p>En {ambiente.toLowerCase()} no hay cámara: solo micrófono y altavoz.</p>
                </div>
              </div>
            )}

            {fase !== "inactivo" && (
              <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-xs">
                <Chip tono={fase === "vigilando" ? "ok" : fase === "calmando" ? "alerta" : "info"}>{ETIQUETA_FASE[fase]}</Chip>
                {camaraPermitida && modelo && (
                  <Chip tono={modelo === "listo" ? "ok" : modelo === "error" ? "error" : "info"}>
                    <Camera className="size-3" /> {modelo === "listo" ? "Detección activa" : modelo === "error" ? "Sin detección" : "Cargando modelo…"}
                  </Chip>
                )}
                {silencioHasta > ahora && ahora > 0 && (
                  <Chip tono="alerta">Pausa por falsa alarma · {Math.ceil((silencioHasta - ahora) / 1000)} s</Chip>
                )}
                {pose && camaraPermitida && modelo === "listo" && (
                  <Chip tono={pose.fase === "observando" ? "alerta" : "info"}>
                    {pose.visible ? `Torso ${Math.round(pose.anguloTorso)}°` : "Sin persona en cuadro"}
                  </Chip>
                )}
              </div>
            )}

            {parcial && fase !== "inactivo" && (
              <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-sm backdrop-blur">
                <Mic className="size-4 shrink-0 text-teal-300" />
                <span className="truncate">{parcial}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-sm font-semibold">Panel de demo</h2>
              <button
                onClick={() => setVozIa((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
              >
                <Sparkles className="size-3.5" />
                Voz {vozIa ? "IA" : "del navegador"}
                {fuenteVoz === "navegador" && vozIa && <span className="text-amber-300">(usando respaldo)</span>}
              </button>
              <button
                onClick={() => setEscucha((e) => !e)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
              >
                {escucha ? <Ear className="size-3.5" /> : <EarOff className="size-3.5" />}
                Modo conversación {escucha ? "activo" : "pausado"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIMULACIONES.map((s) => (
                <button
                  key={s.tipo}
                  disabled={fase === "inactivo" || fase === "preguntando" || fase === "evaluando"}
                  onClick={() => void manejarIncidente(s.tipo, true)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <form onSubmit={enviarTexto} className="mt-3 flex gap-2">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={fase === "inactivo"}
                placeholder={fase === "preguntando" ? "Responder como la persona…" : "Hablar como la persona (ej. «tengo sed»)"}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-500 disabled:opacity-40"
              />
              <button disabled={fase === "inactivo"} className="rounded-lg bg-teal-400 px-3 text-slate-950 disabled:opacity-40" aria-label="Enviar">
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-900/60">
          <div className="border-b border-white/10 p-4">
            <h2 className="text-sm font-semibold">Lo que pasa en la casa</h2>
            {persona && (
              <p className="mt-1 text-xs text-slate-400">
                Cuidando a {persona.avatar} {persona.name} en {ambiente.toLowerCase()}
              </p>
            )}
          </div>
          {fase !== "inactivo" && (
            <div className="space-y-3 border-b border-white/10 p-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <Mic className="size-3.5" /> Escuché
                  {entendido && <span className="normal-case tracking-normal text-slate-500">· {entendido.contexto}</span>}
                </p>
                <p className="mt-1 text-base text-white">
                  {fase === "preguntando" && parcial ? (
                    <span className="text-slate-300">«{parcial}»…</span>
                  ) : entendido ? (
                    entendido.escuche ? `«${entendido.escuche}»` : <span className="text-slate-400">No respondió</span>
                  ) : (
                    <span className="text-slate-500">{escucha ? "Escuchando…" : "Modo conversación pausado"}</span>
                  )}
                </p>
              </div>
              {entendido && (
                <div
                  className={cn(
                    "rounded-xl p-3",
                    entendido.tono === "ok" && "bg-emerald-500/10",
                    entendido.tono === "alerta" && "bg-amber-500/15",
                    entendido.tono === "info" && "bg-white/5",
                  )}
                >
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Brain className="size-3.5" /> Entendí
                    {entendido.fuente && (
                      <span className="normal-case tracking-normal text-slate-500">
                        · {entendido.fuente === "ia" ? "IA" : "reglas de respaldo"}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-medium text-white">{entendido.entendi ?? "Pensando…"}</p>
                  {entendido.detalle && <p className="mt-0.5 text-xs text-slate-400">{entendido.detalle}</p>}
                </div>
              )}
            </div>
          )}
          <ol className="max-h-[70dvh] flex-1 space-y-2 overflow-y-auto p-4 text-sm">
            {log.length === 0 && <li className="text-slate-500">Todavía no pasó nada.</li>}
            {log.map((l) => (
              <li key={l.id} className="flex gap-2">
                <span className="w-16 shrink-0 font-mono text-xs leading-5 text-slate-500">{l.hora}</span>
                <span
                  className={cn(
                    "leading-5",
                    l.quien === "sistema" && "text-teal-200",
                    l.quien === "persona" && "font-medium text-white",
                    l.quien === "info" && "text-slate-400",
                    l.quien === "error" && "text-rose-300",
                  )}
                >
                  {l.quien === "sistema" && "🔊 "}
                  {l.quien === "persona" && "🗣️ "}
                  {l.texto}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}

const ETIQUETA_FASE: Record<Fase, string> = {
  inactivo: "Apagado",
  vigilando: "Vigilando",
  preguntando: "Preguntando…",
  evaluando: "Evaluando respuesta…",
  calmando: "Protocolo de calma",
};

function Chip({ children, tono }: { children: React.ReactNode; tono: "ok" | "info" | "alerta" | "error" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium backdrop-blur",
        tono === "ok" && "bg-emerald-500/20 text-emerald-200",
        tono === "info" && "bg-black/50 text-slate-200",
        tono === "alerta" && "bg-amber-500/25 text-amber-100",
        tono === "error" && "bg-rose-500/25 text-rose-100",
      )}
    >
      {children}
    </span>
  );
}
