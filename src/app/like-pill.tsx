"use client";

import type { LikeState } from "./use-likes";

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
        <span
          className={`text-base leading-none ${state.liked ? "text-gold-light" : "text-card"}`}
        >
          {state.liked ? "♥" : "♡"}
        </span>
        {state.count > 0 && (
          <span className="text-xs text-card">{state.count}</span>
        )}
      </span>
    </button>
  );
}
