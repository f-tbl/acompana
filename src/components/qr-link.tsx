"use client";

import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

const origen = () => window.location.origin;

/** QR para abrir una ruta de la app desde el celular (ej. la app del cuidador durante el demo). */
export function QrLink({ path, size = 132 }: { path: string; size?: number }) {
  const base = useSyncExternalStore(() => () => {}, origen, () => "");
  if (!base) return <div style={{ width: size, height: size }} />;
  return <QRCodeSVG value={base + path} size={size} className="rounded-lg bg-white p-2" />;
}
