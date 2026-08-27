"use client";

import { useRef, useState } from "react";

type LikeState = { liked: boolean; count: number };

export function LikePill({
  photoId,
  initialLiked,
  initialCount,
  labels,
}: {
  photoId: string;
  initialLiked: boolean;
  initialCount: number;
  labels: { like: string; unlike: string };
}) {
  const [state, setState] = useState<LikeState>({
    liked: initialLiked,
    count: initialCount,
  });
  const requestId = useRef(0);

  async function toggle() {
    const previous = state;
    const liked = !previous.liked;
    setState({ liked, count: Math.max(previous.count + (liked ? 1 : -1), 0) });

    const id = ++requestId.current;
    try {
      const response = await fetch(`/api/photos/${photoId}/like`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        liked: boolean;
        likeCount: number;
      };
      if (id === requestId.current) {
        setState({ liked: data.liked, count: data.likeCount });
      }
    } catch {
      if (id === requestId.current) setState(previous);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
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
