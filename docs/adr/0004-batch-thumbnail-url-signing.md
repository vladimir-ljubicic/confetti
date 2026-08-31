# ADR-0004: Batch thumbnail URL signing

## Status

Superseded by ADR-0005: public photos' renditions serve unsigned from a public
bucket, so no per-screen authorization or signing is left to batch. Issue 29
closed wontfix.

## Context

ADR-0003 renders every photo through `/api/photos/[id]/thumb`, which authorizes
per request and redirects to a short-lived signed URL. A screen of ~40 tiles
therefore costs 40 function invocations and 40 uncached PostgREST round trips
that re-decide visibility for the same viewer.

Measured when ADR-0003 landed: the hop costs 153–178ms per eager tile, and a
trivial PostgREST request against this project costs 126–188ms. The cost is
round-trip overhead on the visibility lookup, not query work and not image
bytes — thumbnails are ~50 kB and come back from Cloudflare as 304s.

The requests are concurrent over one HTTP/2 connection, so a screen costs
roughly one round trip of wall-clock today. What scales with tile count is
invocations and database round trips.

Two ways to remove them:

**Cache the lookup.** Wrap the per-photo visibility row in `unstable_cache` with
a short revalidate. No client change, no new endpoint, no signed URL in the DOM.
Invocations remain; the database round trip goes.

**Batch the authorization.** A `POST /api/photos/thumbs` taking up to 100 ids and
returning a signed URL or `null` per id, driven by a client hook that requests
what it lacks. One invocation and one query per screen.

## Decision

Not taken. The batch route is specified in issue 29 but held, for two reasons
recorded here so they are not rediscovered.

The grid is not virtualized (ADR-0002): every one of up to 2000 photos mounts on
first render. A hook keyed on mount requests all 2000 ids before the viewer
scrolls. What bounds image fetching today is `loading="lazy"` — a browser
visibility signal no hook can observe. Batching is only cheaper than the current
route once something tracks visibility.

Handing signed URLs to `<img src>` also reverses an ADR-0003 consequence: the
URL a viewer copies out of the page becomes a bearer credential to private
storage again, valid for up to `GALLERY_URL_TTL_SECONDS` and shareable. Batching
authorization does not require this; batching *signing* does.

The server half of issue 29 stands independently. Extracting the visibility
predicate into one function both routes call removes the duplication risk, and
duplication here means a private photo rendering for the wrong viewer.

## Consequences

- Photos keep rendering from a stable per-id route. The `<img src>` stays in the
  SSR'd HTML, so the browser's preload scanner starts fetching before hydration,
  and no copied URL grants standalone access to storage.
- Per-screen cost stays at ~40 invocations. Caching the visibility lookup is the
  cheaper of the two levers and the one to measure first.
- Batching becomes worth reopening if the grid is virtualized or tiles gain an
  IntersectionObserver, since the blocking objection is the missing visibility
  signal rather than the endpoint itself.
- `galleryImageUrls` signs one URL per photo. Any batch route would need
  Supabase's `createSignedUrls` (plural) to avoid 100 signing calls in one
  invocation, and that endpoint ignores a `transform` argument — so batch
  signing and per-width transforms cannot both be had.
