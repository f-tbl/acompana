import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tipografía de la landing: diseñada para lectores con baja visión, pensada para familias y personas mayores.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

const descripcion =
  "Acompañar cuida a quien pasa tiempo solo en casa y no puede valerse por sí mismo. Si se cae o pide ayuda, le habla, evalúa la gravedad y avisa a quien corresponda. El video no sale de la casa.";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title: { default: "Acompañar", template: "%s" },
  description: descripcion,
  applicationName: "Acompañar",
  keywords: ["teleasistencia", "detección de caídas", "personas mayores", "demencia", "cuidadores", "seguridad en el hogar"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Acompañar",
    title: "Acompañar · Seguridad en casa para quien no puede valerse por sí mismo",
    description: descripcion,
  },
  twitter: {
    card: "summary",
    title: "Acompañar",
    description: descripcion,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2f2b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${geistSans.variable} ${geistMono.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
