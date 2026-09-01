# 43 — Hide the sort toggle until the album has ≥10 likes

**What to build:** ALIGN §3 / REVIEW §2 — below 10 total likes the two orders look
identical and the control reads as broken.

**Status:** done

- [x] Gate on album-wide like total, not photo count (`gallery-header.tsx:287` and
      `guest-bar.tsx:88` gate on `count > 0` today); no like sum exists anywhere
- [x] Derivation: `photos.reduce((s,p) => s + p.likeCount, 0) >= 10` once `useFullGallery`
      completes, or a server-side sum on the head payload
- [x] Fix the toggle pop-in while at it: header currently renders nothing until the
      background fetch lands, then the toggle appears a beat after first paint
      (`sort-toggle.tsx:8` comment describes the shift the split was meant to avoid)

Refs: ALIGN §3 Sort; REVIEW §2.

## Comments

Gate lives in `sort-mode.ts` (`sumLikes`, `sortToggleShown`, floor of 10). The
gallery header gates on the whole album's total, a guest's bar on that guest's
own — a deviation from the checklist, which names one album-wide total for both
sites: a bar's toggle only reorders what that bar covers, and the album's total
would offer a guest with two likes an order that cannot rearrange anything.

Both totals are album-scope, never "what is loaded": the header's is the
server's sum until the background fetch replaces it with the client's own, and
a guest's comes from their gallery-wide uploader stats, which every gallery
fetch refreshes. So neither gate turns on how much of the gallery has arrived,
and revealing the new-photos pill cannot flip one.

The album total cannot be summed from the head, so it comes from the database:
`public_like_total()` (migration 0021, index-only scan on
`photos_public_popular_idx`), read by `loadPublicLikeTotal`. `GalleryView`
hands it to the header through the stats context and replaces it with the
client's own sum once the background fetch completes, so likes arriving later
still move the gate.

Pop-in is gone on both sides: the header decides at first paint from the server
total, and `GalleryLoading` reads the same number — one cached call serves both
— so its stand-in toggle never appears where the loaded header would withhold
one. Both callers fail open on the aggregate: a gallery nobody can open is
worse than one without a sort toggle. `gallery-count.tsx` became
`gallery-stats.tsx` to carry both numbers, and ADR-0006 gained the tradeoff:
first paint now pays one indexed aggregate for what a head cannot be counted
for.
