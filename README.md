# Guardián: MVP para la hackatón

Sistema de seguridad en el hogar para personas sin autonomía personal (ver `spec.md`).

## Stack

| Capa | Qué se usa |
|---|---|
| App | Next.js 16 (App Router) + TypeScript, desplegada en Vercel |
| UI | Tailwind CSS v4 + lucide-react |
| Base de datos | Supabase Postgres + **Drizzle ORM** (`postgres-js`) |
| Tiempo real | Supabase Realtime (broadcast) + polling de respaldo |
| Video del incidente | MediaRecorder en el navegador → Supabase Storage (bucket privado, URL firmada) |
| Detección de caídas | MediaPipe Pose Landmarker, **corre en el navegador** (WASM/GPU) |
| Escucha | Web Speech API (`SpeechRecognition`, usar Chrome) |
| Voz de la casa | AI SDK `generateSpeech` por el Vercel AI Gateway (`google/gemini-3.8-flash-lite-tts`); respaldo: voz del navegador |
| Evaluación de respuestas | AI SDK (`generateText` + `Output.object` con Zod) por el AI Gateway, con `google/gemini-3.8-flash`; sin credenciales usa reglas |

## Pantallas

- `/casa`: el «equipo de la casa». Notebook o celular con cámara, micrófono y altavoz. Detecta caídas, pregunta por voz, escucha pedidos y corre el protocolo de calma. Tiene un **panel de demo** para simular eventos y escribir respuestas si hay mucho ruido.
- `/cuidador`: app móvil del cuidador. Alertas en vivo con el video, «Pedir ambulancia», «Falsa alarma», «Me ocupo» y pedidos.
- `/historial`: registro diario.
- `/perfiles`: fichas médicas.
- `/ficha/[token]`: el paquete temporal que «recibe» emergencias (ubicación + ficha + incidente).

## Cómo funciona

```
/casa (navegador)                          Vercel (Next.js API)               Supabase
cámara → MediaPipe → caída                                                 
  → altavoz: «¿Estás bien?»                                                
  → escucha 15 s ──────────────▶ POST /api/incidentes                      
                                   la IA (AI Gateway) clasifica la respuesta
                                   puntaje 1–10 (src/lib/score.ts) ──▶ Postgres (Drizzle)
  ◀── URL firmada si nivel ≥ 2                                             
  → sube clip de ~10 s ──────────────────────────────────────────────▶ Storage
  → broadcast "cambio" ──────────────────────────────────────────────▶ Realtime ──▶ /cuidador
```

- **Privacidad:** el video se procesa en el navegador de la casa. Solo se sube el clip si hay alerta (nivel ≥ 2). En baño y dormitorio la cámara se apaga y queda solo el audio.
- **Puntaje:** `src/lib/score.ts` son reglas puras (evento + respuesta + hora + contexto). Por ejemplo, caída con «estoy bien» da 2, caída con dolor da 8 y caída sin respuesta da 10.
- **Escalamiento:** `src/lib/escalation.ts`. Lo dispara `POST /api/escalar`, que la casa y el cuidador llaman cada 5 s. Es idempotente, así que Vercel no necesita cron.
  - Nivel 4–6: si nadie responde en `NEXT_PUBLIC_ESCALATION_SECONDS`, avisa al contacto secundario.
  - Nivel 7–8: avisa también al vecino y a teleasistencia; si nadie responde, llama a emergencias (simulado).
  - Nivel 9–10: arranca una cuenta regresiva de `NEXT_PUBLIC_COUNTDOWN_SECONDS` y después llama a emergencias.
- **Qué entendió:** el equipo de la casa muestra lo que escuchó el reconocimiento de voz y cómo lo interpretó (por ejemplo «Respondió con coherencia que está bien» o «Pedido: tiene sed»). La app del cuidador también lo muestra en cada alerta.
- **IA de Vercel:** todo pasa por el AI Gateway. En Vercel se autentica solo; en local hace falta `AI_GATEWAY_API_KEY` o `vercel env pull`. Sin credenciales, el demo sigue andando con reglas y con la voz del navegador.
- **Pausa tras falsa alarma:** cuando el cuidador toca «Falsa alarma», las detecciones automáticas (caída, movimiento brusco, inmovilidad, salida y grito) se ignoran durante `NEXT_PUBLIC_FALSE_ALARM_SILENCE_SECONDS` (60 s por defecto). El botón de pánico y los pedidos por voz siguen funcionando. Desde el celular se puede reactivar antes con «Reactivar ya».

## Puesta en marcha

1. Crear un proyecto en [Supabase](https://supabase.com). También se puede crear desde Vercel → Storage → Supabase, que carga las variables solo.
2. Copiar `.env.example` a `.env.local` y completar los valores.
3. Instalar dependencias y preparar la base:

   ```bash
   npm install
   npm run db:push   # crea las tablas con drizzle-kit
   npm run db:seed   # carga a Rosa, Tomi, los contactos y crea el bucket «clips»
   npm run dev
   ```

4. Abrir `http://localhost:3000/casa` en Chrome y `http://localhost:3000/cuidador` en otra pestaña o en el celular.
   - La cámara y el micrófono del celular exigen HTTPS. En local usá `npm run dev -- --experimental-https` o probá directamente en Vercel.

### Deploy en Vercel

1. Subir el repo a GitHub e importarlo en Vercel.
2. Cargar las mismas variables de `.env.local` en Project Settings → Environment Variables. En `DATABASE_URL` va el pooler en modo transacción (puerto 6543).
3. Deploy. Las migraciones y el seed se corren desde tu máquina contra la misma base.

## Guion del demo

1. **Falsa alarma:** en `/casa`, sentarse de golpe frente a la cámara (o tocar «Sentarse de golpe»). Responder «estoy bien». Solo queda en el historial.
2. **Emergencia:** «caerse» frente a la cámara (o tocar «Caída») y no responder. Al celular llega la alerta con el video.
3. Tocar **Pedir ambulancia** en el celular. Se genera el enlace con la ubicación y la ficha, con un QR.
4. **Niño:** cambiar el perfil a Tomi y decir «tengo sed». El pedido llega al celular. Al tocar «Voy», el altavoz le avisa a Tomi.

Consejos para el demo:
- Buena luz y la cámara a 2–3 m, de modo que se vea el cuerpo entero.
- Si la detección falla, usar el panel de simulación: el resto del flujo es idéntico.
- Si hay mucho ruido, pausar el «Modo conversación» y escribir las respuestas en el campo de texto.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run db:push` | Sincroniza el esquema de Drizzle con la base |
| `npm run db:generate` | Genera migraciones SQL en `drizzle/` |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Borra y carga los datos del demo |

## Estructura

```
src/
  app/                 páginas y rutas API (api/incidentes, api/hablar, api/eventos, api/escalar…)
  components/          hub (casa), cuidador, ficha
  db/                  esquema y cliente Drizzle
  lib/                 puntaje, escalamiento, voz, detector de caídas, grabador de clips
  server/              lógica de servidor (eventos, evaluación con IA, voz, Supabase)
scripts/seed.ts        datos del demo
```
