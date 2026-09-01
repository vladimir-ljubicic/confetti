"use client";

import { useEffect, useState } from "react";
import { backToTopShown } from "@/lib/back-to-top";

// The way out of a long gallery, in the bottom-left corner a thumb already
// reaches — the opposite corner from the centred upload pill, so the two never
// meet. It holds its place while away rather than leaving the tree, so that
// coming and going is a fade.
export function BackToTop({ label }: { label: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const measure = () =>
      setShown((current) =>
        backToTopShown(current, window.scrollY, window.innerHeight),
      );
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[22px] z-[5] mx-auto flex max-w-5xl px-3.5">
      <button
        type="button"
        aria-label={label}
        onClick={() => window.scrollTo(0, 0)}
        className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-ink/14 bg-card text-[19px] leading-none text-gold-small shadow-[0_10px_24px_-12px_rgb(43_38_32/0.45)] transition-[opacity,visibility,background-color] duration-200 hover:bg-gold-tint active:bg-sand motion-reduce:transition-none ${
          shown ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <span aria-hidden>↑</span>
      </button>
    </div>
  );
}
