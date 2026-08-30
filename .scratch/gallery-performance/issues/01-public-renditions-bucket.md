# 01 — Serve public photos' renditions from a public bucket

**What to build:** Public photos' thumbnails (and viewer renditions, issue 02)
move to a public bucket and `<img src>` points straight at the storage CDN
URL. Removes the per-tile `/api/photos/[id]/thumb` hop measured at 153–178ms —
one function invocation plus one uncached PostgREST round trip per image. See
ADR-0005 for the decision and the revocation reasoning.

**Status:** done

## Bucket and paths

- Migration in the style of `0002_private_photos_bucket.sql`: bucket
  `renditions`, `public = true`.
- Canonical paths derived from the photo id: `<photoId>/thumb.jpg` (and
  `<photoId>/viewer.jpg` from issue 02). The photo id is a v4 uuid — the URL is
  unguessable without it. `thumbnail_path` keeps recording the stored path;
  which bucket holds it is a function of the photo's visibility.
- Upload with `cache-control: public, max-age=31536000, immutable`. Content
  never changes at a path; revocation removes the object, and grids drop a
  revoked photo when metadata refreshes, so long browser caching is safe.

## Upload pipeline

- The client-side thumbnail PUT targets the `renditions` bucket at the
  canonical path (uploads default to public visibility).
- `api/uploads/[id]/complete` stores the canonical path as today.

## Revocation and restore

On every visibility flip and soft-delete/restore, move the photo's renditions
between buckets (copy + delete if cross-bucket `move` is unavailable in the
client): private or deleted ⇒ private `photos` bucket, same path; public and
live ⇒ `renditions`. The purge cron deletes renditions from whichever bucket
holds them, alongside the original.

## Render paths

- Public tiles (main gallery, per-guest gallery, public tiles in my-photos):
  `src` is the public CDN URL built from the photo id — no request touches our
  API.
- Private tiles in my-photos, the admin gallery and the bin keep
  `/api/photos/[id]/thumb`, which signs from the private bucket, unchanged.
- The client picks by the visibility it already renders; `hideBrokenImage`
  already covers the propagation race on a just-revoked photo.

## Seed

`scripts/seed.mjs` uploads thumbs to `renditions` at canonical paths and sets
`thumbnail_path`, so dev exercises the CDN path (today it leaves
`thumbnail_path` null and dev silently signs originals).

## Out of scope

Viewer renditions (issue 02, same mechanism), signed-URL constants, the proxy
route's internals.

## Acceptance

- [x] Main gallery public tiles load with zero requests to `/api/photos/*` —
      verified in the Network tab
- [x] Making a photo private: my-photos still renders it (proxy), and its CDN
      URL stops resolving once propagation passes
- [x] Soft-delete: bin renders it (proxy); restore brings the CDN URL back
- [x] Purge removes renditions for both public and private photos
- [x] Seeded gallery serves tiles from the CDN
- [x] No signed URL appears anywhere in the page payload
