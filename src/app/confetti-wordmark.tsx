"use client";

import Link from "next/link";
import { ConfettiMark } from "./confetti-mark";
import { useSort } from "./sort-context";

const BOX = "-m-1.5 flex items-center gap-1.5 p-1.5";

// The Confetti wordmark, and the way home from every screen that carries it:
// the gallery's top in latest order. Inside the gallery view the sort context
// resets it in place; elsewhere it is a navigation. `reload` forces a full
// load, for a screen a soft navigation cannot leave (the error boundary).
export function ConfettiWordmark({
  variant = "animated",
  reload = false,
}: {
  variant?: "animated" | "static";
  reload?: boolean;
}) {
  const sortContext = useSort();

  const wordmark = (
    <>
      <ConfettiMark size={14} variant={variant} />
      <span className="text-[11px] text-ink/45 uppercase tracking-[0.2em]">Confetti</span>
    </>
  );

  if (reload) {
    return (
      // eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load is the point
      <a href="/" className={BOX}>
        {wordmark}
      </a>
    );
  }

  return (
    <Link
      href="/"
      prefetch={false}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (!sortContext) return;
        event.preventDefault();
        sortContext.setSort("latest");
      }}
      className={BOX}
    >
      {wordmark}
    </Link>
  );
}
