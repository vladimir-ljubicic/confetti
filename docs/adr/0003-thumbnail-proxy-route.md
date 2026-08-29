# ADR-0003: Photos render through a proxy route, not signed URLs

## Status

Accepted. Implementation tracked in
`.scratch/confetti-redesign/issues/28-thumbnail-proxy-route.md`.

## Context

Storage is private (ADR-0002 in `migrations/0002`), so every rendered photo needs
a credential. Minting one per photo and sending it with the gallery makes the
page grow with the gallery.

Measured on a 142-photo gallery:

| | raw | gzipped | per photo |
| --- | --- | --- | --- |
| photo array with `imageUrl` | 121,916 | 18,752 | 132 B |
| photo array without `imageUrl` | 52,336 | 6,239 | 44 B |

A signed URL is 490 bytes. Only 43 of those are the HMAC, but that HMAC differs
per photo, so the whole string resists compression: 490 raw collapses to ~202
gzipped and no further. The URL is also serialized twice per photo — once into
the SSR'd `<img src>`, once into the RSC payload that hydrates the client
component holding the photo array — and a third time for the eager tiles, which
get a `<link rel="preload">`.

Extrapolated to the 2000-photo cap, credentials cost ~400 kB gzipped against
~86 kB for all the metadata they are attached to.

A signed URL also cannot be withdrawn. Once handed out it keeps working until it
expires, whatever happens to the photo behind it.

## Decision

Photos render from `/api/photos/[id]/thumb`, a stable URL derived from the photo
id. The route authorizes the request, then redirects to a short-lived signed URL
for the stored image.

No signed URL is sent to the browser as part of a page. `PublicPhoto` and the
admin equivalents carry no `imageUrl`; the client builds the path from the id it
already holds as a React key.

Public photos are served through the same route as private ones. Storage stays
private for every object, thumbnails included.

## Consequences

- Per-photo payload drops from 132 B gzipped to 44 B. The gallery's cost stops
  tracking the number of photos in any meaningful way.
- Revoking access works. Deleting a photo or making it private takes effect on
  the shared URL immediately, because authorization is re-checked per request
  rather than frozen into a token. Bytes already downloaded are gone for good;
  the guarantee covers future fetches.
- Every image costs one extra hop and one function invocation on a cache miss.
  The redirect's `max-age` is the lever between invocation volume and how
  promptly a revocation is felt.
- The redirect is authorized per viewer, so its `Cache-Control` must be
  `private`. A shared cache holding it would serve one viewer's authorization to
  another.
- The URL a viewer can copy out of the page no longer grants standalone access
  to storage, and no longer changes between renders, so browsers keep images
  across page loads instead of refetching them hourly.
- Supabase image transforms compose with this: the width belongs in the signed
  URL the route redirects to, invisible to the payload. Transform URLs are 563
  bytes against 479 plain, and the batch signing endpoint ignores a `transform`
  argument, so signing per request rather than per gallery is what makes them
  affordable.
