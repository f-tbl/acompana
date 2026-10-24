import type { Metadata } from "next";
import { SimuladorReloj } from "@/components/reloj/simulador-reloj";

export const metadata: Metadata = { title: "Reloj · Acompañar" };

export default function RelojPage() {
  return <SimuladorReloj />;
}
