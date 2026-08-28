"use client";

import type { LikeState } from "./use-likes";

// Drawn as SVG: the ♥/♡ text glyphs come from font fallback (Jost has no
// heart) and their weight varies wildly across devices.
export function HeartIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function LikePill({
  state,
  onToggle,
  labels,
}: {
  state: LikeState;
  onToggle: () => void;
  labels: { like: string; unlike: string };
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={state.liked}
      aria-label={state.liked ? labels.unlike : labels.like}
      className="absolute right-2 bottom-2 -mb-[5px] flex min-h-11 items-end pb-[5px]"
    >
      <span className="box-border flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-full bg-[rgba(27,24,21,0.58)] px-2.5 backdrop-blur-[6px]">
        <HeartIcon
          filled={state.liked}
          className={`h-4 w-4 ${state.liked ? "text-gold-light" : "text-card"}`}
        />
        {state.count > 0 && (
          <span className="text-xs text-card">{state.count}</span>
        )}
      </span>
    </button>
  );
}
