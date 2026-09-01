// The photos a grid has already stood a tile up for. A tile fades in the first
// time its photo appears; a windowed grid remounting it mid-scroll is not an
// arrival, and neither is a photo coming back to a grid that was narrowed.
export const NO_SHOWN_TILES: ReadonlySet<string> = new Set<string>();

// Tiles of an arriving page enter one after another. Past the eighth the
// stagger stops growing: a whole page waiting its turn would trail far behind
// the scroll.
const PAGE_STAGGER_MS = 40;
const MAX_STAGGERED_TILES = 8;

// The same set comes back when the grid holds nothing new, so remembering an
// unchanged grid is not a change of state.
export function withShownTiles(
  shown: ReadonlySet<string>,
  ids: Iterable<string>,
): ReadonlySet<string> {
  let next: Set<string> | null = null;
  for (const id of ids) {
    if (shown.has(id)) continue;
    next ??= new Set(shown);
    next.add(id);
  }
  return next ?? shown;
}

// How long a tile waits before entering, from its place in the page it arrived
// with; nothing for a tile that arrived with no page.
export function tileEnterDelay(order: number | undefined): string | undefined {
  if (order === undefined) return undefined;
  return `${Math.min(order, MAX_STAGGERED_TILES) * PAGE_STAGGER_MS}ms`;
}
