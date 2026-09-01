// Two columns of staggered tiles at typical photo shapes, the real grid's
// gutters and padding.
const SKELETON_COLUMNS = [
  ["3 / 4", "1 / 1", "4 / 5", "3 / 4", "1 / 1"],
  ["1 / 1", "4 / 5", "3 / 4", "1 / 1", "4 / 5"],
];

// Stands in for the grid while its photos are unknown. Clipped to the screen
// rather than sized to it: the page must not scroll into space the real grid
// may not fill, and the screen's height is not known where this renders.
export function GridSkeleton() {
  return (
    <div
      aria-hidden
      className="grid-skeleton grid min-h-0 w-full flex-1 grid-cols-2 items-start gap-2 overflow-hidden px-3"
    >
      {SKELETON_COLUMNS.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-2">
          {column.map((aspectRatio, index) => (
            <span
              key={index}
              style={{ aspectRatio }}
              className="block rounded-tile bg-sand"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
