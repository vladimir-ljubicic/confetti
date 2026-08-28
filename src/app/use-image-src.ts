"use client";

import { useState } from "react";

type SrcState = { signed: string; src: string; retried: boolean };

// A signed gallery URL stops working a couple of hours after the page that
// carries it was rendered, so a tab left open through an evening scrolls into
// images storage now rejects. The first failure asks for a freshly signed URL;
// a second is left alone, because a photo that was deleted, hidden or never
// signed will not load however often it is asked for.
export function useImageSrc(photoId: string, signedUrl: string) {
  const initial: SrcState = { signed: signedUrl, src: signedUrl, retried: false };
  const [state, setState] = useState(initial);
  if (state.signed !== signedUrl) setState(initial);
  const current = state.signed === signedUrl ? state : initial;

  function onError() {
    if (current.retried) return;
    setState({ ...current, retried: true });
    void fetch(`/api/photos/${photoId}/image-url`)
      .then((response) =>
        response.ok ? (response.json() as Promise<{ url: string }>) : null,
      )
      .catch(() => null)
      .then((body) => {
        if (!body) return;
        setState((previous) =>
          previous.signed === signedUrl ? { ...previous, src: body.url } : previous,
        );
      });
  }

  return { src: current.src, onError };
}
