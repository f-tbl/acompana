"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/live";
import type { RelojesJson } from "@/lib/types";
import type { EstadoReloj } from "@/lib/vitales";

/** Consulta el estado de los relojes cada `pollMs` (el reloj manda datos cada 2 s). */
export function useRelojes(pollMs = 2000, activo = true) {
  const [relojes, setRelojes] = useState<Record<string, EstadoReloj> | null>(null);
  const corriendo = useRef(false);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    const leer = async () => {
      if (corriendo.current) return;
      corriendo.current = true;
      try {
        const r = await api<RelojesJson>("/api/vitales");
        if (vivo) setRelojes(r.relojes);
      } catch {
        // reintenta en el próximo ciclo
      } finally {
        corriendo.current = false;
      }
    };
    void leer();
    const t = setInterval(leer, pollMs);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [pollMs, activo]);

  return relojes;
}
