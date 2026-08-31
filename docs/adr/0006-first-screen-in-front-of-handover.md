# ADR-0006: A server-rendered first screen in front of the handover

## Status

Accepted. Amends ADR-0002. Implementation tracked in
`.scratch/gallery-performance/issues/03-first-screen-and-virtual-grid.md` and
`04-guest-page-cold-load.md`.

## Context

ADR-0002 ships every public photo's metadata before first paint and mounts
every photo as a live DOM node, capped at 2000. The cap is no longer wanted:
the gallery should hold 10,000 photos and still paint a first viewport in
under ~1.5s on a mid-range phone on 4G, with the sort toggle staying
client-side instant. At 10,000 the handover is ~430 kB gzipped before anything
paints, the DOM holds 10,000 `<img>` nodes, and the viewer-likes query
silently truncates at its 2000 limit.

## Decision

The server renders only the first screen of tiles for the requested sort. The
full metadata array arrives by a background fetch after hydration and replaces
the head; sorting and guest filtering stay client-side over it, exactly as in
ADR-0002. The grid is virtualized: off-screen tiles reserve height from their
aspect ratios but mount no `<img>`.

Cold loads of a per-guest gallery query only that guest's photos for first
paint — the uploader-led indexes from migration 0014 exist for this — and the
full set still arrives in the background so in-app navigation keeps the
instant client-side filter.

`totalCount` is the loaded array's length; the exact count query is dropped.

## Consequences

- First-paint cost is one screen of tiles regardless of gallery size; the
  page stops growing with the gallery.
- The sort toggle is instant once the background fetch lands; pressed before
  that, it waits on the in-flight fetch — a window of roughly one round trip
  after hydration.
- A metadata list endpoint now exists (ADR-0002 had none). It must respect the
  ~16 KB URL ceiling: no id fan-out in query strings.
- Virtualization gives the grid a real visibility signal
  (IntersectionObserver), the thing whose absence blocked ADR-0004's client
  half — moot for public photos under ADR-0005, relevant if signed galleries
  ever need batching.
- The counter reports what the grid holds; past-cap overstatement is gone.
