# ADR-0002: The gallery is handed over whole

## Status

Accepted, with a known ceiling — see Consequences.

## Context

The gallery has two sort modes and a per-guest filter, and both the sort toggle
and a guest's tile label are things a viewer taps repeatedly while browsing.
Serving each of those from the server costs a round trip and re-renders the grid
from scratch.

A wedding's gallery is bounded: one event, a few hundred guests, photos only
during the upload window. The whole set fits in a payload the client can hold.

## Decision

`loadPublicPhotos` (`src/lib/public-photos.ts`) fetches every public photo in one
query, capped at `GALLERY_MAX_PHOTOS = 2000`, and hands the array to the client.
`gallery-view.tsx` sorts it with `comparePhotos` and narrows it by
`uploader.publicId` in `useMemo`, updating the URL via `history` without
navigating. There is no list endpoint for photo metadata and no cursor.

Thumbnail bytes are not part of this handover. Tiles past `EAGER_TILES = 6`
carry `loading="lazy"` (`src/app/photo-grid.tsx`) and reserve their height from
`image_width`/`image_height`, so the browser fetches images as they scroll in.

## Consequences

- Sorting and entering or leaving a guest's gallery cost no server round trip.
- Whatever a photo carries is paid for twice — once in the SSR'd markup, once in
  the RSC payload that hydrates the client component holding the array. Keeping
  per-photo fields small is what keeps this affordable. How images are addressed
  without paying a credential per photo is decided in ADR-0003.
- The grid is not virtualized; every photo is a live DOM node with its own
  `<img>`.
- `totalCount` comes from an exact count, not from the rows returned, so past the
  cap the viewer's counter reports more photos than the grid holds.
- Any per-photo lookup that fans the id list out to Supabase must send it in a
  request body, not a query string. A PostgREST `in.()` filter is a GET, and the
  URL ceiling in front of this project is ~16KB — roughly 370 photo ids. The
  gallery is expected to exceed that. `public_uploader_stats` is an RPC (POST)
  for this reason.
- Admin photos (`src/lib/admin-gallery.ts`) deliberately does not follow this
  pattern: it keyset-paginates at `ADMIN_PAGE_SIZE = 30` and re-queries on each
  filter chip.
