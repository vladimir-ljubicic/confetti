# 08 — Per-uploader public pages

**What to build:** Tapping an uploader's name anywhere in the gallery opens a page showing that uploader's public photos only.

**Blocked by:** 05 — Visibility enforcement.

**Status:** ready-for-agent

- [x] Uploader names in the gallery link to their page
- [x] Page shows only that uploader's public photos; private ones absent

## Comments

Implemented: uploader ids double as device tokens, so pages use a new
`public_id` column (migration 0004, applied) in `/uploader/[publicId]` URLs.
Gallery tiles show the uploader name as an overlay link; shared
`loadPublicPhotos` + `PhotoGrid` back both the gallery and the uploader page.
Unknown/malformed ids 404. The page carries the same sort toggle and
date-based default as the gallery (shared `SortToggle`). Verified against the
dev server with seeded public+private rows: private photo absent from the
uploader page, chrono toggle works.
