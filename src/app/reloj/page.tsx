import type { Metadata } from "next";
import { SimuladorReloj } from "@/components/reloj/simulador-reloj";

export const metadata: Metadata = { title: "Reloj · Guardián" };

export default function RelojPage() {
  return <SimuladorReloj />;
}
