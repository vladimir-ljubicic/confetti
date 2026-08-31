"use client";

import { useEffect, useState } from "react";

export type VisualViewportBox = { height: number; offsetTop: number };

// The part of the page actually on screen: what the on-screen keyboard leaves
// of it, and where that sits within the layout viewport. Browsers that resize
// the layout viewport for the keyboard report the same height as the window;
// those that let the keyboard cover the page report less, with the offset the
// page has been scrolled to keep the focused field in view. null until the
// first measurement, and where the API is missing.
export function useVisualViewport(): VisualViewportBox | null {
  const [box, setBox] = useState<VisualViewportBox | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    function measure() {
      if (!viewport) return;
      setBox((current) =>
        current?.height === viewport.height &&
        current.offsetTop === viewport.offsetTop
          ? current
          : { height: viewport.height, offsetTop: viewport.offsetTop },
      );
    }
    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    return () => {
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
    };
  }, []);

  return box;
}
