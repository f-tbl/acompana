"use client";

import { useEffect } from "react";

const BLOQUES = [
  "main section h2",
  "main section h2 + p",
  "main section .mt-12 > * > *",
  "main section > div > ul > li",
].join(", ");

/** Hace aparecer los bloques de cada sección al scrollear. Sin JS, todo queda visible. */
export function Revelar() {
  useEffect(() => {
    const raiz = document.querySelector(".landing");
    if (!raiz || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("visto");
          io.unobserve(el);
          // sin el retraso escalonado, el hover de las tarjetas responde al instante
          setTimeout(() => (el.style.transitionDelay = ""), 1000);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    raiz.querySelectorAll<HTMLElement>(BLOQUES).forEach((el) => {
      const hermano = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.transitionDelay = `${(hermano % 4) * 90}ms`;
      el.classList.add("revelar");
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
