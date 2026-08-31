# 29 — Batch authorization and signing for thumbnail URLs

**What to build:** A screen of ~40 tiles currently makes 40 requests to
`/api/photos/[id]/thumb`, each one function invocation plus one uncached
PostgREST round trip (Belgrade → Dublin, ~120ms) that re-decides visibility for
the same viewer 40 times. Issue 28 closed with exactly this measurement: the hop
costs 153–178ms per eager tile, "nearly all of it the route's own visibility
lookup — one PostgREST round trip, uncached, per image".

Image bytes are not the problem. Cloudflare holds them, responses come back
REVALIDATED + 304, thumbnails are ~50 kB. The cost is the per-photo
authorization.

**Status:** wontfix

## Scope: server first, client second

The server half stands on its own and is worth landing regardless. The client
half is blocked — see *Blocked on visibility loading* below.

## Part A — shared predicate and a batch route

### Extract the visibility predicate

`/api/photos/[id]/thumb` decides visibility inline. Lift it into one function in
`src/lib/` that both routes call:

```
canRenderPhoto(photo, { deviceId, admin }): boolean
```

Two copies of this logic drift, and drift here means a private photo leaking.
The predicate is the whole of it: `uploaded_at` set; `deleted_at` set ⇒ admin
only; `visibility !== "public"` ⇒ `uploader_id === deviceId` or admin.
Resolve `getDeviceId()` and `isAdmin()` once per request, not once per photo.

### The route

`POST /api/photos/thumbs`.

Request `{ "ids": ["uuid", ...] }`, response `{ "urls": { "uuid": "https://…",
"uuid": null } }`.

- `null` means the viewer may not see that photo, or it does not exist. A batch
  is never rejected as a whole because one photo is unavailable — an unreachable
  photo must be indistinguishable from a missing one, same as the 404 on the
  existing route.
- One query, `.in("id", ids)`, not a loop. Filter ids through `isUuid`
  (`src/lib/uploaders.ts`) first, as `like/route.ts` does, so arbitrary strings
  never reach `.in()`.
- Limit 100 ids per request; over that, 400.
- POST, not GET — ADR-0002 records the ~16KB URL ceiling in front of this
  project, ~370 ids.
- `cache-control: private, max-age=${THUMB_MAX_AGE_SECONDS}` — the same budget
  as today. `private` is required for the same reason as on the existing route:
  the response is authorized for one viewer.
- Do not touch `signingWindow`, `GALLERY_URL_TTL_SECONDS` or
  `GALLERY_URL_WINDOW_SECONDS`.

`/api/photos/[id]/thumb` stays. Direct links, sharing, the viewer and the bin
need it. This is an addition, not a replacement.

### Signing is the new bottleneck, and it is not one query

`galleryImageUrls` maps `stableSignedUrl` over the array — one
`createSignedUrl` call per photo. One DB query for the rows, still 100 signing
calls in a single invocation on a cold signing window. Supabase exposes
`createSignedUrls` (plural) for real batch signing; if a cold batch is slow,
that is where it goes. ADR-0003 notes the plural endpoint ignores a `transform`
argument, so adopting it forecloses per-width transforms later.

## Part B — the client hook, blocked

`useThumbUrls()` holding a `Map<id, url>`, requesting only what it lacks,
coalescing requests mounted in the same tick, debounced ~100ms; a tile shows its
`aspectRatio` backing until the URL arrives; URLs older than ~10 min that are
still visible get re-requested; a failed batch falls back to
`/api/photos/[id]/thumb`.

### Blocked on visibility loading

The grid is not virtualized (ADR-0002): all 2000 photos mount as live DOM nodes
on first render. A hook that requests what it lacks *on mount* requests all 2000
ids in the first tick — 20 batch calls, 2000 rows, 2000 signings — before the
viewer has scrolled a pixel. What bounds the work today is `loading="lazy"`, a
browser-level visibility signal the hook cannot observe.

So the acceptance criterion "one request per screen at 2000 photos" is not
reachable while visibility-driven loading is out of scope. Either that work
comes in (IntersectionObserver over the tiles, or virtualization), or Part B
does not land.

### It also delays first paint

Today `<img src="/api/photos/:id/thumb">` is in the SSR'd HTML, so the preload
scanner starts fetching before React hydrates. Under the hook no tile has a
`src` until JS downloads, hydrates, the effect runs, ~100ms of debounce elapses
and the batch returns (~120ms). The six eager tiles (`EAGER_TILES`) trade a
measured 153–178ms hop for hydration + 220ms that cannot start earlier. If those
tiles keep an SSR `src`, they cannot come from the batch at all — which is the
right answer, and worth stating in the ticket rather than discovering in the
Network tab.

## Objection: the latency arithmetic

"40 × 120ms → 1 × 120ms per screen" overstates the win. The 40 requests are
concurrent over one HTTP/2 connection, not serialized; a screen costs roughly
one round trip plus server time today, not forty. What actually falls 40× is
function invocations and PostgREST round trips — a cost and server-load
argument, and a real one. Not a 40× latency win.

## Cheaper alternative that Part A should be measured against

Cache the per-photo visibility row server-side (`unstable_cache`, short
revalidate) inside the existing route. That removes the same 40 DB round trips
— the part issue 28 measured as the whole of the hop — with no client change, no
second render path, no new endpoint, and no signed URL in the DOM. Function
invocations remain, but they are cheap next to a Belgrade → Dublin trip.

Measure this first. If a cached lookup brings the hop down to single-digit
milliseconds, Part B buys invocation count and nothing a viewer can feel.

## Security property this gives up

ADR-0003 records as a consequence: "The URL a viewer can copy out of the page no
longer grants standalone access to storage." Handing signed URLs to `<img src>`
reverses that — copy image address yields a bearer URL to private storage, valid
up to `GALLERY_URL_TTL_SECONDS` (15 min) and shareable with anyone. Revocation
latency is unchanged (still TTL-bounded), but the sharing property is not. See
ADR-0004.

## Out of scope

Bucket, upload, `cacheControl` metadata, the signing logic itself.

## Acceptance

### Part A
- [ ] One visibility predicate, called by both routes; no second copy
- [ ] `POST /api/photos/thumbs` issues one `photos` query per request
- [ ] Another guest's private photo comes back `null`, matching the 404 on the
      existing route
- [ ] A deleted photo comes back `null` for guests and a URL for an admin
- [ ] 101 ids ⇒ 400; a non-UUID id ⇒ `null`, no DB error
- [ ] `/api/photos/[id]/thumb` unchanged in behaviour
- [ ] Cached-lookup alternative measured against the batch route, numbers in the
      comments

### Part B (only if unblocked)
- [ ] Tiles mounting in one tick produce one request, not forty
- [ ] A failed batch leaves no empty gallery — tiles fall back to the per-photo
      route
- [ ] LCP on the eager tiles does not regress against today's measurement
- [ ] One request for URLs per screen at 2000 photos, verified in the Network tab

## Comments

Raised as a performance ticket against the gallery. Part A is uncontested and
independently useful; the shared predicate is worth extracting whether or not
the batch route is ever called by the grid.

The blocking objection to Part B is the un-virtualized grid: "what a tile needs"
and "what is on screen" are the same set only if something tracks visibility,
and today only the browser does. Issue 28's own closing note points at caching
the visibility lookup as the fix for the measured cost, which is a smaller
change reaching the same number.

2026-08-30 — Closed wontfix. ADR-0005 moves public photos' renditions into a
public bucket served straight from the CDN, so no per-tile authorization or
signing remains to batch. The proxy route survives only for private and
deleted photos, where it stays the single copy of the visibility check — Part
A's extraction has nothing second to share it with. Follow-up effort:
`.scratch/gallery-performance/`.
