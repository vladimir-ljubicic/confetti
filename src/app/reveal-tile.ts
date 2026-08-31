import { revealScrollTop } from "@/lib/grid-window";

// Scrolls the page to put a mounted tile on screen, if it isn't already.
export function revealTile(tile: Element | null | undefined) {
  if (!tile) return;
  const rect = tile.getBoundingClientRect();
  const target = revealScrollTop(
    { top: rect.top + window.scrollY, height: rect.height },
    window.scrollY,
    window.innerHeight,
  );
  if (target !== null) window.scrollTo(0, target);
}
