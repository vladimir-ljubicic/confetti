// Pointer travel that tells a drag apart from a tap; whichever axis leads by
// then owns the gesture, and a sideways lead leaves the touch to the track's
// own horizontal scroll.
const DRAG_THRESHOLD_PX = 10;

// Either a long enough drag or a short quick flick dismisses.
const DISMISS_DISTANCE_PX = 110;
const FLICK_DISTANCE_PX = 16;
const FLICK_VELOCITY_PX_PER_MS = 0.5;

// A finger resting this long before lifting is no longer flicking.
const VELOCITY_STALE_MS = 90;

// Drag over which the photo shrinks and the backdrop thins to their floors.
const FADE_DISTANCE_PX = 320;
const SCALE_FLOOR = 0.88;
const BACKDROP_FLOOR = 0.3;

export function dragAxis(
  dx: number,
  dy: number,
): "pending" | "horizontal" | "vertical" {
  if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
    return "pending";
  }
  return Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
}

export function flingDirection(travelled: number): -1 | 1 {
  return travelled < 0 ? -1 : 1;
}

// Whether the release lets the photo go. `sinceSample` is the wait between the
// last movement and the lift, null when the drag left no sample at all.
export function dismissed(
  travelled: number,
  velocity: number,
  sinceSample: number | null,
): boolean {
  const direction = flingDirection(travelled);
  const flicking =
    sinceSample !== null &&
    sinceSample <= VELOCITY_STALE_MS &&
    velocity * direction > FLICK_VELOCITY_PX_PER_MS &&
    Math.abs(travelled) > FLICK_DISTANCE_PX;
  return flicking || Math.abs(travelled) > DISMISS_DISTANCE_PX;
}

export function dismissProgress(offset: number): number {
  return Math.min(1, Math.abs(offset) / FADE_DISTANCE_PX);
}

export function photoScale(progress: number): number {
  return 1 - progress * (1 - SCALE_FLOOR);
}

// The stage never clears: the gallery behind it stays a hint rather than a
// second picture competing with the one under the finger.
export function backdropOpacity(progress: number): number {
  return 1 - progress * (1 - BACKDROP_FLOOR);
}
