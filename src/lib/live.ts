"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

// Vercel no mantiene WebSockets: el aviso en tiempo real viaja por Supabase Realtime (broadcast).
// Cada cliente que modifica algo avisa "cambio" y los demás vuelven a pedir los datos.
// Si Supabase no está configurado, queda el polling como respaldo.

let channel: RealtimeChannel | null = null;
const listeners = new Set<() => void>();

function getChannel() {
  if (channel) return channel;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  channel = createClient(url, key)
    .channel("casa")
    .on("broadcast", { event: "cambio" }, () => listeners.forEach((l) => l()))
    .subscribe();
  return channel;
}

export function avisarCambio() {
  void getChannel()?.send({ type: "broadcast", event: "cambio", payload: {} });
}

export function useEnVivo(onCambio: () => void, pollMs = 5000) {
  const cb = useRef(onCambio);
  useEffect(() => {
    cb.current = onCambio;
  });
  useEffect(() => {
    const l = () => cb.current();
    listeners.add(l);
    getChannel();
    l();
    const t = setInterval(l, pollMs);
    return () => {
      listeners.delete(l);
      clearInterval(t);
    };
  }, [pollMs]);
}

export async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function subirClip(path: string, token: string, blob: Blob) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const { error } = await createClient(url, key)
    .storage.from("clips")
    .uploadToSignedUrl(path, token, blob, { contentType: blob.type });
  if (error) console.error("subirClip", error);
  return !error;
}
