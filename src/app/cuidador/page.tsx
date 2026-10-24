import type { Metadata, Viewport } from "next";
import { AppCuidador } from "@/components/cuidador/app-cuidador";

export const metadata: Metadata = { title: "Cuidador · Acompañar" };
export const viewport: Viewport = { themeColor: "#fafaf9" };

export default function CuidadorPage() {
  return <AppCuidador />;
}
