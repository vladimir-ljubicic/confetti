"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

// Pointer travel that tells a downward drag apart from a tap or a sideways move.
const DRAG_THRESHOLD_PX = 6;

// Either a long enough drag or a short quick flick closes the sheet.
const DISMISS_DISTANCE_PX = 90;
const FLICK_DISTANCE_PX = 16;
const FLICK_VELOCITY_PX_PER_MS = 0.45;

// A finger resting this long before lifting is no longer flicking.
const VELOCITY_STALE_MS = 90;

const CLOSE_MS = 200;

// Drag-down-to-dismiss for a bottom sheet. Spread `sheetProps` on the panel
// and `backdropStyle` on the element carrying the dimmed background;
// `onDismiss` runs once the sheet has slid off screen.
export function useSheetDismiss(onDismiss: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);

  const origin = useRef<{ x: number; y: number } | null>(null);
  const sample = useRef<{ y: number; time: number } | null>(null);
  const velocity = useRef(0);
  const offsetRef = useRef(0);
  const dragged = useRef(false);
  const suppressClick = useRef(false);

  // Kept in a ref so a re-render of the sheet's owner cannot restart the
  // close timer with a fresh callback identity.
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => dismiss.current(), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  function moveTo(next: number) {
    offsetRef.current = next;
    setOffset(next);
  }

  function down(event: ReactPointerEvent) {
    suppressClick.current = false;
    if (closing) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Text fields own their own drag gestures (caret, selection).
    if ((event.target as HTMLElement).closest("input, textarea, select")) return;
    origin.current = { x: event.clientX, y: event.clientY };
    sample.current = { y: event.clientY, time: event.timeStamp };
    velocity.current = 0;
    dragged.current = false;
  }

  function move(event: ReactPointerEvent) {
    const from = origin.current;
    if (from === null) return;
    // A release outside the panel before the drag began never reaches us;
    // the next hover move must not be read as a continuation of it.
    if (event.buttons === 0) {
      origin.current = null;
      return;
    }
    const dy = event.clientY - from.y;
    if (!dragged.current) {
      if (Math.abs(event.clientX - from.x) > DRAG_THRESHOLD_PX || dy < -DRAG_THRESHOLD_PX) {
        origin.current = null;
        return;
      }
      if (dy < DRAG_THRESHOLD_PX) return;
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
    const resting =
      sample.current === null || event.timeStamp - sample.current.time > VELOCITY_STALE_MS;
    const flicked =
      !resting &&
      velocity.current > FLICK_VELOCITY_PX_PER_MS &&
      offsetRef.current > FLICK_DISTANCE_PX;
    if (flicked || offsetRef.current > DISMISS_DISTANCE_PX) setClosing(true);
    else moveTo(0);
  }

  function cancel() {
    origin.current = null;
    dragged.current = false;
    setDragging(false);
    moveTo(0);
  }

  // The button under the finger must not fire once the release ended a drag.
  function clickCapture(event: ReactMouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  const style: CSSProperties = {
    transform: closing ? "translateY(110%)" : `translateY(${offset}px)`,
    transition: dragging ? "none" : `transform ${CLOSE_MS}ms ease-out`,
    touchAction: "none",
  };

  return {
    sheetProps: {
      style,
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: up,
      onPointerCancel: cancel,
      onClickCapture: clickCapture,
    },
    backdropStyle: {
      opacity: closing ? 0 : 1,
      transition: `opacity ${CLOSE_MS}ms ease-out`,
    } satisfies CSSProperties,
  };
}
