# 24 — Viewer caption becomes uploader pill

**What to build:** Replace the plain italic name in the viewer caption zone (7a) with a
tappable uploader pill that opens 7b (`/uploader/[publicId]`).

**Status:** done

- [x] 999px pill: 1px `rgba(250,246,238,0.22)` border, `rgba(250,246,238,0.08)` fill,
      padding `5px 14px 5px 6px`, min-height 48px
- [x] Contents: 34px avatar circle (`rgba(250,246,238,0.16)` fill, initial in Cormorant
      16px `#e8dcc0`), name 21px Cormorant italic `#f0e7d2` over "12 фотографија" (11px),
      chevron "›" `rgba(250,246,238,0.55)`
- [x] Photo-count-per-uploader needs to reach the viewer payload
- [x] Pill appears in viewers opened from `/`, `/uploader/[publicId]`, and admin.
      **Exception:** viewer opened from `/my-photos` keeps the plain italic name — no
      need for a guest to navigate to themselves
- [x] No pill when uploader has no display name (as today)

## Comments

Decided: pill everywhere except the /my-photos viewer; in 7b's own viewer it self-links,
which is fine.

Decided (grilling 2026-08-28): count is the *public* photo count in every context,
admin's viewer included — it must match what 7b shows after tapping. The /my-photos
exception can key off the existing `publicId: ""` the profile view already passes.
