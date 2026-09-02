// Where a slide sits along a track that lays its slides out in fractions of its
// own width, and which slide a scroll position stands on.
//
// The width both answers are multiples of is the track's real one, fractions
// and all: a screen 392.72px wide places its thousandth slide 280px from where
// a whole-pixel 393 would put it, and its four-thousandth more than a slide
// away.

export function slideOffset(index: number, slideWidth: number): number {
  return index * slideWidth;
}

export function slideAt(
  scrollLeft: number,
  slideWidth: number,
  count: number,
): number {
  if (slideWidth <= 0 || count <= 0) return 0;
  return Math.max(0, Math.min(Math.round(scrollLeft / slideWidth), count - 1));
}
