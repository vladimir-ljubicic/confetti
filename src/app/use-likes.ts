"use client";

import { useRef, useState } from "react";

export type LikeState = { liked: boolean; count: number };

// One like state per photo, shared by every control rendering that photo
// (grid pill and viewer pill stay in sync). Server rows seed the state;
// toggles are optimistic and reconciled against the API response.
export function useLikes() {
  const [states, setStates] = useState<Record<string, LikeState>>({});
  const requestIds = useRef<Record<string, number>>({});

  function stateFor(photoId: string, seed: LikeState): LikeState {
    return states[photoId] ?? seed;
  }

  async function toggle(photoId: string, seed: LikeState) {
    const previous = states[photoId] ?? seed;
    const liked = !previous.liked;
    setStates((current) => ({
      ...current,
      [photoId]: {
        liked,
        count: Math.max(previous.count + (liked ? 1 : -1), 0),
      },
    }));

    const id = (requestIds.current[photoId] ?? 0) + 1;
    requestIds.current[photoId] = id;
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
      if (requestIds.current[photoId] === id) {
        setStates((current) => ({
          ...current,
          [photoId]: { liked: data.liked, count: data.likeCount },
        }));
      }
    } catch {
      if (requestIds.current[photoId] === id) {
        setStates((current) => ({ ...current, [photoId]: previous }));
      }
    }
  }

  return { stateFor, toggle };
}

export type Likes = ReturnType<typeof useLikes>;
