# 28 — Render photos through /api/photos/[id]/thumb

**What to build:** Every render path currently mints a signed URL per photo and
ships it to the browser, which costs 132 B gzipped per photo against 44 B for the
metadata, and hands out access that cannot be withdrawn. Replace it with a stable
route the client derives from the photo id. See ADR-0003 for the decision and the
measurements behind it.

**Status:** ready-for-agent

## The route

`GET /api/photos/[id]/thumb`. Model it on `src/app/api/photos/[id]/download/route.ts`
— same shape, same visibility check, different target and cache headers.

- Select `storage_path, thumbnail_path, original_filename, visibility, uploader_id,
  uploaded_at, deleted_at`.
- 404 unless `uploaded_at` is set.
- A non-public photo needs `getDeviceId()` to match `uploader_id`, or `isAdmin()`.
- A deleted photo is visible to an admin only — the recycle bin renders deleted
  photos and must keep working. `download/route.ts` 404s on `deleted_at` for
  everyone; this route cannot.
- Redirect 302 to `signedUrl(thumbnail_path ?? storage_path)`, matching what
  `galleryImageUrls` picks today.
- `Cache-Control: private, max-age=300`. **`private` is required**: the redirect is
  authorized for one viewer, and a shared cache holding it would serve that
  authorization to somebody else.
- Sign the target for ~600s. It must outlive the cached redirect, or a browser
  follows a cached 302 to an expired token.

`max-age` trades function invocations against how quickly a revocation is felt.
Worst case a viewer keeps rendering a revoked photo for roughly `max-age` plus the
remaining token life. Start at 300s; `no-store` makes revocation immediate at the
cost of an invocation per image load.

## Call sites to convert

All five drop `galleryImageUrls` from their render path and stop returning a URL
field; the client builds `/api/photos/${id}/thumb`.

- `src/lib/public-photos.ts:130` — main gallery; drop `imageUrl` from `PublicPhoto`
- `src/lib/admin-gallery.ts:73` — admin photos
- `src/app/my-photos/page.tsx:39`
- `src/app/admin/guests/[publicId]/page.tsx:67`
- `src/app/admin/bin/page.tsx:34` — deleted photos, hence the admin exception above

`galleryImageUrls` and the `unstable_cache` wrapper in `src/lib/photo-urls.ts` stay
— the new route uses them for one photo at a time. The tick-batching added for
whole-gallery signing (`pendingSigns` / `flushSigns`) no longer has a caller that
signs in bulk and should go with it.

## Cleanups this unlocks

- `src/app/use-image-src.ts` deletes entirely. It exists because a signed URL
  expires while the page holding it stays open; a stable route never does.
  `GalleryImage` in `src/app/photo-grid.tsx` uses `src` directly.
- `src/app/api/photos/[id]/image-url/route.ts` deletes — its only caller is
  `use-image-src.ts`.
- `photo-grid.tsx:254` guards on `entry.photo.imageUrl` to skip photos that failed
  to sign. With no URL in the payload that guard has nothing to test; an image that
  cannot be served now 404s at the route, so handle it with `onError` on the
  `<img>` rather than by omitting the tile.

## Acceptance

- [ ] No `object/sign` URL appears in the HTML of any gallery, admin, my-photos or
      bin page
- [ ] A photo made private stops rendering for other guests without a redeploy or
      cache flush
- [ ] A deleted photo stops rendering for guests and still renders in the admin bin
- [ ] Admin still sees private photos; a guest still sees their own
- [ ] Gallery payload per photo drops to ~44 B gzipped (measure with the method in
      ADR-0003)
- [ ] Images survive a page reload from browser cache instead of refetching

## Comments

Found while comparing admin photo loading against the main gallery. Full reasoning,
the rejected alternatives (public thumbnail bucket, lazy batched URL fetch) and the
payload measurements are in ADR-0003.

A public bucket was rejected deliberately: it is the cheapest option and the only
one with no per-image hop, but a public object URL keeps working after its photo is
deleted or made private, and revocation is the property that matters here.

Watch first-paint latency on the six eager tiles (`EAGER_TILES`, `photo-grid.tsx:22`).
They gain a redirect hop before any image byte moves. `<link rel="preload">` still
applies to the route URL, so the hop should overlap the rest of the render; if LCP
regresses, that is the place to look.

ADR-0002 describes the payload cost of the whole-gallery handover and points here
for how images are addressed. Its wording assumes no per-photo credential once this
lands; check it still reads true when closing this ticket.
