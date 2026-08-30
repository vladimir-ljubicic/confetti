# 03 — First-screen SSR, background metadata, virtualized grid

**What to build:** The gallery must hold 10,000 photos and still paint its
first viewport in < 1.5s on a mid phone on 4G. Today every photo's metadata
ships before first paint and mounts as a live DOM node. See ADR-0006.

**Status:** done

## First paint

- `loadPublicPhotos` gains a head mode: first ~40 rows for the requested sort
  (both sort orders are index-covered). The server renders only those tiles.
- Drop `{ count: "exact" }`; the counter shows the loaded array's length.
- Eager tiles: keep ~6 `loading="eager"` + `fetchPriority="high"`, matching
  the real first viewport; the rest of the SSR head stays lazy.

## Background handover

- New `GET /api/photos` returning the full public metadata array (same fields
  as today, same 44 B/photo shape). No id fan-out — the ~16 KB URL ceiling
  from ADR-0002 stands. Plain pagination by cursor is fine if one response
  feels too big; the client just wants the whole set eventually.
- The client fetches it after hydration and replaces the head. Sorting and
  guest filtering stay `useMemo` over the full array, as today.
- Sort toggle pressed before the fetch lands waits on the in-flight fetch —
  show the existing loading treatment, never a second server round trip.
- Raise `GALLERY_MAX_PHOTOS` to 10,000 — a safety valve again, not a design
  ceiling. `loadViewerLikes` and its 2000 limit follow (a device's own likes
  stay small; the limit just must not silently truncate below the cap).

## Virtualization

- Two fixed columns and DB-known aspect ratios mean tile heights are computable
  without measuring: hand-roll windowing on cumulative column heights — no
  library. Off-screen tiles render as height placeholders with no `<img>`;
  overscan ~2 viewports each way.
- Keys stay photo ids; scroll position must survive the head→full swap and
  refresh-on-focus merges (issue 06).
- The optimistic-upload tile and `EAGER_TILES` behaviour must survive inside
  the window.

## Acceptance

- [x] First-paint HTML contains ~40 tiles regardless of gallery size; RSC
      payload stops growing with the gallery
- [x] Sort toggle and pill filter < 100ms once the background fetch lands
- [x] 10,000-photo seed scrolls smoothly on a mid phone; DOM node count stays
      bounded (verify with the seed cranked to 10k)
- [x] Counter equals the grid; no exact-count query in any gallery request
- [x] Toggling sort before the fetch lands shows loading, then the full order
