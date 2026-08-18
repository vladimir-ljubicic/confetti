# 07 — Sort modes: live feed / chronological + EXIF capture

**What to build:** Each upload records the photo's EXIF taken-time (extracted client-side at upload). The gallery offers a manual toggle between **Live feed** (upload time, newest first) and **Chronological** (taken time, falling back to upload time when EXIF is missing). Live feed is the default until the wedding day (2026-09-20) ends; chronological after.

**Blocked by:** 02 — Tracer: upload one photo → see it in gallery.

**Status:** ready-for-agent

- [ ] Taken-time stored for uploads whose EXIF has it; missing EXIF falls back to upload time
- [ ] Toggle switches sort modes
- [ ] Default is live feed through 2026-09-20, chronological afterwards
