"use client";

import type { SortMode } from "@/lib/sort-mode";
import { useSort } from "./sort-context";

export type SortToggleLabels = { latest: string; popular: string };

// Split from the toggle so the gallery's loading state can stand in for it with
// the same box: a placeholder of another shape would move the header the moment
// the real toggle arrives.
export function SortToggleView({
  labels,
  active,
  onSelect,
}: {
  labels: SortToggleLabels;
  active: SortMode;
  onSelect?: (sort: SortMode) => void;
}) {
  const options = [
    { mode: "latest", label: labels.latest },
    { mode: "popular", label: labels.popular },
  ] as const;

  return (
    <nav className="flex shrink-0 rounded-pill bg-sand p-[3px] text-meta">
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          disabled={onSelect === undefined}
          onClick={() => onSelect?.(option.mode)}
          aria-pressed={active === option.mode}
          className={`relative rounded-pill px-3 py-[7px] transition before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-[''] ${
            active === option.mode
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

export function SortToggle({ labels }: { labels: SortToggleLabels }) {
  const sortContext = useSort();
  if (!sortContext) return null;
  const { sort, setSort } = sortContext;

  return (
    <SortToggleView
      labels={labels}
      active={sort}
      onSelect={(mode) => {
        if (mode !== sort) setSort(mode);
      }}
    />
  );
}
