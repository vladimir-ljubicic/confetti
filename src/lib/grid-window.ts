// Geometry for the virtualized photo grid. Tile heights are computable from
// the column width and each photo's recorded aspect ratio, so the window needs
// no measuring: off-screen tiles collapse into one spacer per column edge and
// the column keeps its full scroll height.

// Stands in for a photo whose pixel size was never recorded, so its tile still
// reserves a plausible height instead of collapsing to nothing.
const FALLBACK_TILE = { width: 3, height: 4 };
export const FALLBACK_TILE_RATIO = FALLBACK_TILE.height / FALLBACK_TILE.width;
export const FALLBACK_TILE_ASPECT = `${FALLBACK_TILE.width} / ${FALLBACK_TILE.height}`;

// Photos in the server-rendered head, and the mount cap while the grid is
// still unmeasured: enough tiles to fill the first screens while the client
// fetches the whole gallery in the background. One constant, so hydration
// always mounts exactly the tiles the server rendered.
export const GALLERY_HEAD_PHOTOS = 40;

// Height as a fraction of the tile's width.
export function tileHeightRatio(size: {
  width: number | null;
  height: number | null;
}): number {
  return size.width && size.height
    ? size.height / size.width
    : FALLBACK_TILE_RATIO;
}

// Nominal tile geometry for dealing, matching the design's mobile column
// width and the grid's tile gap. Dealing happens before anything is measured,
// so it estimates heights at this size for every screen.
const DEAL_COLUMN_WIDTH = 180;
const DEAL_GAP = 8;

// Deals tiles to the grid's two columns: each tile lands on the currently
// shorter column (ties go left), so order reads left-right/top-down and the
// column bottoms stay close. The gap is part of a tile's height here: the
// column collecting shorter tiles holds more of them, and its extra gaps
// would otherwise add up to a visible lead over thousands of tiles. Returns
// each column's tile indexes into the given list.
export function dealColumns(ratios: number[]): [number[], number[]] {
  const left: number[] = [];
  const right: number[] = [];
  let leftHeight = 0;
  let rightHeight = 0;
  ratios.forEach((ratio, index) => {
    const height = DEAL_COLUMN_WIDTH * ratio + DEAL_GAP;
    if (leftHeight <= rightHeight) {
      left.push(index);
      leftHeight += height;
    } else {
      right.push(index);
      rightHeight += height;
    }
  });
  return [left, right];
}

export type ColumnMetrics = {
  // Top edge of each tile, measured from the column's top.
  offsets: number[];
  heights: number[];
  gap: number;
  total: number;
};

export function columnMetrics(
  ratios: number[],
  columnWidth: number,
  gap: number,
): ColumnMetrics {
  const offsets: number[] = [];
  const heights: number[] = [];
  let y = 0;
  for (const ratio of ratios) {
    offsets.push(y);
    const height = columnWidth * ratio;
    heights.push(height);
    y += height + gap;
  }
  return { offsets, heights, gap, total: ratios.length === 0 ? 0 : y - gap };
}

export type ColumnWindow = {
  // Mounted slice of the column, [start, end).
  start: number;
  end: number;
  // Spacer heights replacing the tiles outside the slice. The flex gap around
  // a spacer is part of the ground it covers, so a spacer is one gap shorter
  // than the run of tiles it stands in for.
  topSpacer: number;
  bottomSpacer: number;
};

// The slice of the column that overlaps the band [viewTop, viewBottom),
// in the column's own coordinates.
export function columnWindow(
  metrics: ColumnMetrics,
  viewTop: number,
  viewBottom: number,
): ColumnWindow {
  const { offsets, heights, gap, total } = metrics;
  const count = offsets.length;
  let start = 0;
  while (start < count && offsets[start] + heights[start] <= viewTop) start++;
  let end = start;
  while (end < count && offsets[end] < viewBottom) end++;
  return {
    start,
    end,
    topSpacer: start === 0 ? 0 : (start === count ? total + gap : offsets[start]) - gap,
    bottomSpacer: end === count ? 0 : total - offsets[end],
  };
}

// Tiles closer than this to the viewport's edges count as off screen: the
// sticky header and the floating buttons cover the edges, and a tile hugging
// one is not where the eye lands.
const ON_SCREEN_INSET_PX = 80;

// The scroll position that centers a tile on screen, or null when the tile is
// already comfortably on screen and the scroll should stay put. The tile's top
// is in page coordinates.
export function revealScrollTop(
  tile: { top: number; height: number },
  scrollY: number,
  viewportHeight: number,
): number | null {
  const onScreen =
    tile.top >= scrollY + ON_SCREEN_INSET_PX &&
    tile.top + tile.height <= scrollY + viewportHeight - ON_SCREEN_INSET_PX;
  if (onScreen) return null;
  return Math.max(0, tile.top + tile.height / 2 - viewportHeight / 2);
}
