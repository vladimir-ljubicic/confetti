// Geometry for the virtualized photo grid. Tile heights are computable from
// the column width and each photo's recorded aspect ratio, so the window needs
// no measuring: off-screen tiles collapse into one spacer per column edge and
// the column keeps its full scroll height.

// Stands in for a photo whose pixel size was never recorded, so its tile still
// reserves a plausible height instead of collapsing to nothing.
const FALLBACK_TILE = { width: 3, height: 4 };
export const FALLBACK_TILE_RATIO = FALLBACK_TILE.height / FALLBACK_TILE.width;
export const FALLBACK_TILE_ASPECT = `${FALLBACK_TILE.width} / ${FALLBACK_TILE.height}`;

// Tiles per grid column in the server-rendered head, and the per-column mount
// cap while the grid is still unmeasured. One constant, so hydration always
// mounts exactly the tiles the server rendered.
export const HEAD_TILES_PER_COLUMN = 20;

// Height as a fraction of the tile's width.
export function tileHeightRatio(size: {
  width: number | null;
  height: number | null;
}): number {
  return size.width && size.height
    ? size.height / size.width
    : FALLBACK_TILE_RATIO;
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
