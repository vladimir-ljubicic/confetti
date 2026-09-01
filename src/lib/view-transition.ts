// The name a photo's grid tile and the same photo on the viewer's stage both
// answer to, so the browser morphs one into the other rather than swapping them.
// Exactly one of the two carries it at any moment.
export function photoZoomName(photoId: string): string {
  return `photo-${photoId}`;
}

// Whether the browser can run a View Transition at all. Where it cannot, the
// viewer opens and closes on its own fade instead.
export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function"
  );
}
