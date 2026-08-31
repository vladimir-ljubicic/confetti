"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

// Pointer travel that tells a drag apart from a tap; whichever axis leads by
// then owns the gesture, and a sideways lead leaves the touch to the track's
// own horizontal scroll.
const DRAG_THRESHOLD_PX = 6;

// Either a long enough drag or a short quick flick dismisses.
const DISMISS_DISTANCE_PX = 90;
const FLICK_DISTANCE_PX = 16;
const FLICK_VELOCITY_PX_PER_MS = 0.45;

// A finger resting this long before lifting is no longer flicking.
const VELOCITY_STALE_MS = 90;

// Drag over which the backdrop fades out fully and the photo shrinks to its
// smallest.
const FADE_DISTANCE_PX = 320;
const SHRINK = 0.15;

const SETTLE_MS = 200;

// Drag-up-or-down-to-dismiss for the viewer's slide track. Spread `trackProps`
// on the track and `fadeStyle` on the backdrop and chrome around it. Touch and
// pen only: a mouse drag over an image starts a native image drag instead.
// `onDismiss` runs the moment the release commits; the track keeps flying off
// in the drag's direction while the viewer closes.
export function useSwipeDismiss(onDismiss: () => void) {
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
      if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
        return;
      }
      if (Math.abs(dx) >= Math.abs(dy)) {
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
    const direction = travelled < 0 ? -1 : 1;
    const resting =
      sample.current === null ||
      event.timeStamp - sample.current.time > VELOCITY_STALE_MS;
    const flicked =
      !resting &&
      velocity.current * direction > FLICK_VELOCITY_PX_PER_MS &&
      Math.abs(travelled) > FLICK_DISTANCE_PX;
    if (flicked || Math.abs(travelled) > DISMISS_DISTANCE_PX) {
      setFlung(direction);
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

  const progress =
    flung !== null ? 1 : Math.min(1, Math.abs(offset) / FADE_DISTANCE_PX);
  const settle = `${SETTLE_MS}ms ease-out`;

  const trackStyle: CSSProperties = {
    transform:
      flung !== null
        ? `translateY(${flung * 110}%) scale(${1 - SHRINK})`
        : `translateY(${offset}px) scale(${1 - progress * SHRINK})`,
    transition: dragging ? "none" : `transform ${settle}`,
    // The browser keeps horizontal pans (the track's own scroll) and pinches,
    // and hands every vertical pan to the handlers here instead of claiming
    // it and cancelling the pointer.
    touchAction: "pan-x pinch-zoom",
  };

  return {
    trackProps: {
      style: trackStyle,
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: up,
      onPointerCancel: reset,
      onClickCapture: clickCapture,
    },
    fadeStyle: {
      opacity: 1 - progress,
      transition: dragging ? "none" : `opacity ${settle}`,
    } satisfies CSSProperties,
  };
}
