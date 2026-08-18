# 07 — Sort modes: live feed / chronological + EXIF capture

**What to build:** Each upload records the photo's EXIF taken-time (extracted client-side at upload). The gallery offers a manual toggle between **Live feed** (upload time, newest first) and **Chronological** (taken time, falling back to upload time when EXIF is missing). Live feed is the default until the wedding day (2026-09-20) ends; chronological after.

**Blocked by:** 02 — Tracer: upload one photo → see it in gallery.

**Status:** ready-for-agent

- [x] Taken-time stored for uploads whose EXIF has it; missing EXIF falls back to upload time
- [x] Toggle switches sort modes
- [x] Default is live feed through 2026-09-20, chronological afterwards

## Comments

Implemented: client-side EXIF via `exifr` (JPEG + HEIC), honoring
`OffsetTimeOriginal` with the device zone as fallback; `taken_at` sent with the
upload ticket request; generated `effective_taken_at` column backs the
chronological order; toggle via `?sort=` with the date-based default in
`resolveSortMode`. Gallery's 200-photo cap makes ascending chrono hide later
photos once the gallery outgrows it — spun off as issue 19.
