# 27 — Viewer likes lookup 500s the gallery past ~370 photos

**What to build:** `loadViewerLikes` (`src/lib/public-photos.ts:51-63`) passes every
photo id in the gallery to a PostgREST `in.()` filter, which travels in the GET
query string. Past ~370 ids the URL exceeds the ~16KB ceiling in front of this
project and the request fails. Line 61 throws on the error, which rejects
`loadPublicPhotos`, which `gallery-screen.tsx:41-54` awaits — so the whole gallery
page 500s for any visitor carrying a device id. A wedding gallery is expected to
pass 370 public photos.

Fix: drop the `.in("photo_id", photoIds)` filter. `.eq("device_id", …)` already
scopes the rows to this viewer, and the result is only consumed as
`Set.has(photoId)`, so a superset costs nothing. Alternatively move the lookup to
an RPC so the ids ride in a POST body, as `public_uploader_stats` does.

Watch the PostgREST default row cap when dropping the filter — a viewer who liked
more photos than that would silently lose the tail of their likes.

**Status:** done

- [x] A gallery of 400+ public photos renders for a viewer with a device id
- [x] Likes still show as liked for that viewer
- [x] No photo-id list is sent to Supabase in a query string

## Comments

Measured against this project's Supabase over the REST endpoint, `likes` with a
synthetic id list:

```
n= 350  urlBytes=13034  status=200
n= 400  urlBytes=14884  fetch failed
n=1000  urlBytes=37084  status=400
n=2000  urlBytes=74084  status=414 Request-URI Too Large (cloudflare)
```

So the break is between 350 and 400 ids — well below `GALLERY_MAX_PHOTOS = 2000`.

Found while comparing the admin photos page against the main gallery. Admin is not
affected: it keyset-paginates at 30 and never calls `loadViewerLikes`. Anyone
porting the gallery's whole-handover shape to admin should land this fix first.

Two further scale limits were found at the same time, both softer and not covered
by this ticket — payload growth from serializing a signed URL per photo twice, and
an un-virtualized grid. Recorded in ADR-0002. Also unresolved: past the 2000 cap
the masthead count exceeds the photos actually in the grid, since `totalCount` is
an exact count rather than the row count.

The whole-handover design this sits on top of reverses the server-side pagination
that closed `.scratch/confetti-mvp/issues/19-gallery-pagination.md`; that ticket's
"per-view signed-URL count stays bounded" criterion no longer holds.

Fixed by dropping the id filter: `loadViewerLikes` now takes only the device id and
returns every photo that device liked, bounded by `GALLERY_MAX_PHOTOS`. The photo-id
parameter is gone from the signature, so neither caller can reintroduce the URL.
`my-photos` shared the same bug and is covered by the same change.

The request URL is now a constant 131 bytes against the real project, against 74KB
at 2000 photos before. The 400+ criterion is met structurally — no id list reaches
the URL at any gallery size — rather than by rendering a 400-photo gallery; the
local database holds 156.
