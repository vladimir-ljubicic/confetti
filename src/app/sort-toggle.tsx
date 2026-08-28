"use client";

import type { SortMode } from "@/lib/sort-mode";
import { useSort } from "./sort-context";

export function SortToggle({
  labels,
}: {
  labels: { latest: string; popular: string };
}) {
  const sortContext = useSort();
  if (!sortContext) return null;
  const { sort, setSort } = sortContext;

  const options = [
    { mode: "latest", label: labels.latest },
    { mode: "popular", label: labels.popular },
  ] as const;

  function select(mode: SortMode) {
    setSort(mode);
    // Keep the URL shareable and correct on reload; the server sorts the
    // initial render from this param.
    const url = new URL(window.location.href);
    url.searchParams.set("sort", mode);
    window.history.replaceState(null, "", url);
  }

  return (
    <nav className="flex shrink-0 rounded-pill bg-sand p-[3px] text-meta">
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          onClick={() => select(option.mode)}
          aria-pressed={sort === option.mode}
          className={`relative rounded-pill px-3 py-[7px] transition before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-[''] ${
            sort === option.mode
              ? "bg-card text-gold-small shadow-[0_1px_2px_rgba(43,38,32,0.08)]"
              : "text-ink/60 hover:text-ink active:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </nav>
  );
}
