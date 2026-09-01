"use client";

import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { useVisualViewport } from "./use-visual-viewport";

// The frame a bottom sheet sits in. Portaled: an ancestor is position:sticky,
// whose stacking context would otherwise trap the sheet below the gallery's
// sticky header bars. Sized to the visible part of the page, so a keyboard
// laid over the page (rather than shrinking it) still leaves the sheet fully
// on screen.
export function SheetShell({
  closeLabel,
  backdropStyle,
  onCancel,
  children,
}: {
  closeLabel: string;
  backdropStyle: CSSProperties;
  onCancel: () => void;
  children: ReactNode;
}) {
  const viewport = useVisualViewport();

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-x-0 top-0 z-50"
      style={
        viewport
          ? {
              height: viewport.height,
              transform: `translateY(${viewport.offsetTop}px)`,
            }
          : { height: "100%" }
      }
    >
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onCancel}
        style={backdropStyle}
        className="scrim-in absolute inset-0 cursor-default bg-ink/[0.42] [backdrop-filter:blur(3px)_opacity(0.5)]"
      />
      {children}
    </div>,
    document.body,
  );
}
