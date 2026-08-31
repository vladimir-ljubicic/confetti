# Gallery performance

Make first paint fast and interactions instant at 10,000 photos, for guests on
phones during the wedding itself.

## Budgets (agreed 2026-08-30)

- First viewport of photos: < 1.5s, mid-range phone, 4G, cold load. Applies to
  the main gallery and per-guest galleries equally.
- Sort toggle and in-app guest filter: < 100ms, no round trip.
- New-photo freshness: ~30s is fine; refresh on focus.
- Popular like-counts: as-of-page-load is fine.
- Revocation window (a photo made private or deleted stops rendering for other
  guests): about a minute, for viewers who have not already fetched it.
- Cost: Supabase Pro for the wedding; ~$20–30 total is acceptable.

## Decisions

- ADR-0005 — public photos' thumbnails and viewer renditions serve straight
  from a public bucket; revocation moves the object. The per-tile proxy hop
  (153–178ms, one invocation + one DB round trip each) goes away.
- ADR-0006 — the server renders only the first screen; full metadata arrives
  by background fetch; the grid is virtualized; client-side sort/filter stays.
- Viewer shows a 1600px rendition, thumbs stay 800px — device math in issue 02.

## Issues

- 01 — public renditions bucket, direct CDN `<img src>`, revocation moves
- 02 — 1600px viewer rendition, thumb-first swap
- 03 — first-screen SSR, background metadata fetch, virtualized grid
- 04 — per-guest gallery cold load queries only that guest
- 05 — height-aware column dealing
- 06 — refresh on focus
