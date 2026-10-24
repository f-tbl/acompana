import type { Metadata } from "next";
import { Hub } from "@/components/hub/hub";

export const metadata: Metadata = { title: "Casa · Guardián" };

export default function CasaPage() {
  return <Hub />;
}
