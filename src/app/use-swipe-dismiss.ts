"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  backdropOpacity,
  dismissed,
  dismissProgress,
  dragAxis,
  flingDirection,
  photoScale,
} from "@/lib/swipe-dismiss";

const SETTLE_MS = 200;

// Drag-up-or-down-to-dismiss for the viewer's slide track. Spread `trackProps`
// on the track, `backdropStyle` on the backdrop and `chromeStyle` on the chrome
// around it. Touch and pen only: a mouse drag over an image starts a native
// image drag instead. `onDismiss` runs the moment the release commits.
//
// `fling` sends the track on off-screen in the drag's direction while the
// viewer closes. Without it the photo stays where the finger left it, which is
// where the zoom back to its tile picks it up.
export function useSwipeDismiss(
  onDismiss: () => void,
  { fling }: { fling: boolean },
) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flung, setFlung] = useState<-1 | 1 | null>(null);

  const origin = useRef<{ x: number; y: number } | null>(null);
  const sample = useRef<{ y: number; time: number } | null>(null);
  const velocity = useRef(0);
  const offsetRef = useRef(0);
  const dragged = useRef(false);
  const suppressClick = useRef(false);

  function moveTo(next: number) {
    offsetRef.current = next;
    setOffset(next);
  }

  function reset() {
    origin.current = null;
    dragged.current = false;
    setDragging(false);
    moveTo(0);
  }

  function down(event: ReactPointerEvent) {
    suppressClick.current = false;
    if (flung !== null || event.pointerType === "mouse") return;
    // A second finger is the start of a pinch, not a drag.
    if (origin.current !== null) {
      reset();
      return;
    }
    origin.current = { x: event.clientX, y: event.clientY };
    sample.current = { y: event.clientY, time: event.timeStamp };
    velocity.current = 0;
    dragged.current = false;
  }

  function move(event: ReactPointerEvent) {
    const from = origin.current;
    if (from === null) return;
    if (event.buttons === 0) {
      origin.current = null;
      return;
    }
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (!dragged.current) {
      const axis = dragAxis(dx, dy);
      if (axis === "pending") return;
      if (axis === "horizontal") {
        origin.current = null;
        return;
      }
      dragged.current = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const previous = sample.current;
    if (previous) {
      const elapsed = event.timeStamp - previous.time;
      if (elapsed > 0) {
        const latest = (event.clientY - previous.y) / elapsed;
        velocity.current = velocity.current * 0.4 + latest * 0.6;
      }
    }
    sample.current = { y: event.clientY, time: event.timeStamp };
    moveTo(dy);
  }

  function up(event: ReactPointerEvent) {
    const wasDragging = dragged.current;
    origin.current = null;
    dragged.current = false;
    if (!wasDragging) return;
    setDragging(false);
    suppressClick.current = true;
    const travelled = offsetRef.current;
    const sinceSample =
      sample.current === null ? null : event.timeStamp - sample.current.time;
    if (dismissed(travelled, velocity.current, sinceSample)) {
      if (fling) setFlung(flingDirection(travelled));
      onDismiss();
    } else {
      moveTo(0);
    }
  }

  // The photo under the finger must not register a tap once the release
  // ended a drag.
  function clickCapture(event: ReactMouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  const progress = flung !== null ? 1 : dismissProgress(offset);
  const settle = `${SETTLE_MS}ms ease-out`;

  const trackStyle: CSSProperties = {
    transform:
      flung !== null
        ? `translateY(${flung * 110}%) scale(${photoScale(1)})`
        : `translateY(${offset}px) scale(${photoScale(progress)})`,
    transition: dragging ? "none" : `transform ${settle}`,
    // The browser keeps horizontal pans (the track's own scroll) and pinches,
    // and hands every vertical pan to the handlers here instead of claiming
    // it and cancelling the pointer.
    touchAction: "pan-x pinch-zoom",
  };

  const fade = (opacity: number): CSSProperties => ({
    opacity,
    transition: dragging ? "none" : `opacity ${settle}`,
  });

  return {
    trackProps: {
      style: trackStyle,
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: up,
      onPointerCancel: reset,
      onClickCapture: clickCapture,
    },
    backdropStyle: fade(backdropOpacity(progress)),
    chromeStyle: fade(1 - progress),
  };
}
