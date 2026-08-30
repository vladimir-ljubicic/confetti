# 04 — Per-guest gallery cold load queries only that guest

**What to build:** A cold visit to `/uploader/[publicId]` (shared link, QR)
currently loads the entire gallery to show one guest's photos. Give it a
scoped first paint; in-app pill navigation keeps the instant client-side
filter. See ADR-0006.

**Status:** done

## Server

- Scoped query: public, live, `uploader_id = ?`, ordered per sort —
  `photos_uploader_latest_idx` / `photos_public_uploader_popular_idx`
  (migration 0014) exist for exactly this and are currently unused.
- A guest's whole public set is small; fetch it all, no head/handover split.
- `photoCount` / `likeTotal` for the header come from the scoped rows.

## Client

- In-app navigation (pill/label tap) keeps filtering the already-loaded array
  with `history.pushState` — no behaviour change.
- After a scoped cold paint, the full-gallery background fetch (issue 03)
  still runs, so leaving the guest page for the main gallery is instant too.
  Left within one round trip of hydration, the grid waits on the in-flight
  fetch without issuing a new request — the window ADR-0006 grants the sort
  toggle.

## Acceptance

- [x] Cold `/uploader/x` issues a query bounded by that guest's photos, not
      the gallery
- [x] Pill-tap navigation from the main gallery makes no photo-metadata
      request
- [x] Back/forward between guest and main gallery stays instant
- [x] Header count/likes match the scoped set
