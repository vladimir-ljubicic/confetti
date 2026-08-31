# ADR-0005: Public photos' renditions serve from a public bucket

## Status

Accepted. Supersedes the public-photo render path of ADR-0003 and dissolves the
question ADR-0004 held open. Implementation tracked in
`.scratch/gallery-performance/issues/01-public-renditions-bucket.md`.

## Context

ADR-0003 put every rendered photo behind `/api/photos/[id]/thumb` so access
could be withdrawn. The measured price (ADR-0004): a 153–178ms hop, one
function invocation and one uncached PostgREST round trip per tile —
multiplied across every screen of a gallery now sized for 10,000 photos under
burst load during the wedding itself.

What the proxy buys is revocation, and its guarantee was always narrower than
it reads. For a viewer who already fetched a photo, the bytes are in browser
cache and on their screen — ADR-0003 concedes "bytes already downloaded are
gone for good". For a viewer re-following a cached redirect, revocation
already waited up to `max-age` plus the remaining token life, ~5–15 minutes.
Only a viewer who had never fetched the photo was blocked immediately.

Issue 28 rejected a public thumbnail bucket because "a public object URL keeps
working after deletion". That objection assumed the object outlives the
photo's visibility. It does not have to.

## Decision

Thumbnails and viewer renditions of **public** photos live in a public bucket
at paths derived from the photo id — an unguessable v4 uuid. `<img src>`
points straight at the storage CDN URL: no proxy, no signing, no invocation,
no database round trip per tile.

Revocation moves the object. Making a photo private or soft-deleting it moves
its renditions into the private bucket; making it public again or restoring it
moves them back. Private and deleted photos keep rendering through the signed
proxy of ADR-0003 (my-photos, the admin gallery, the bin). Originals never
leave the private bucket.

## Consequences

- A public tile costs zero invocations and zero database round trips; bytes
  come from the CDN with long-lived immutable caching. The per-tile hop — the
  largest single contributor to delayed tiles — is gone.
- The client derives the URL from the photo id it already holds, so per-photo
  payload stays at 44 B gzipped: ADR-0003's payload win is kept without its
  route.
- Revocation for viewers who never fetched the photo degrades from immediate
  to CDN propagation after the move — about a minute on Supabase's Smart CDN
  (Pro; the free-tier dev project sees plain CDN TTLs instead). Accepted: the
  gallery's metadata refreshes within ~30s, so a revoked photo drops out of
  every grid regardless; the residual exposure is someone holding the raw URL
  of a photo they were already shown.
- Renditions cached in a viewer's browser may outlive revocation locally. That
  was already true and already conceded.
- Rendition paths are canonical (`<photoId>/thumb.jpg`, `<photoId>/viewer.jpg`)
  and the bucket is a function of visibility, so no path bookkeeping crosses
  the move.
- ADR-0004's batching question dissolves for public photos: there is nothing
  to authorize or sign per screen.
