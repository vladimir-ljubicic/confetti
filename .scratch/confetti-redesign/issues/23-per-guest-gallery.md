# 23 — Per-guest gallery (7b)

**What to build:** Restyle the existing `/uploader/[publicId]` page to the 7b spec —
layout = main gallery verbatim (masonry, glass hearts, sort control, tile labels),
minus upload, plus a guest header.

**Blocked by:** 21, 22

**Status:** done

- [x] Sticky top row: "← Галерија" back link instead of the brand mark
- [x] Compact bar always visible (no ceremonial masthead): guest's 34px avatar (initial
      style as in the viewer pill), name at 19px Cormorant,
      "12 фотографија · 41 ♥" (11px, letter-spacing 0.16em)
- [x] Stats computed server-side over the guest's public photos: count + sum of
      `like_count`. Serbian pluralization for фотографија/фотографије/фотографија
- [x] No upload button
- [x] Private photos never appear (verify `loadPublicPhotos` already excludes them here)
- [x] Viewer opened here scopes swiping to this guest's photos, counter "3 / 12" —
      already the mechanism, verify

## Comments

Decided (grilling 2026-08-28): header stats are a server-rendered snapshot — no live
update when the visitor likes below. Guest with zero public photos gets the full chrome
with "0 фотографија · 0 ♥" + empty message (unknown publicId stays 404, as today).
Frozen state changes nothing on this page. Public-only filtering already holds in
`loadPublicPhotos` for everyone, owner and admin included.
