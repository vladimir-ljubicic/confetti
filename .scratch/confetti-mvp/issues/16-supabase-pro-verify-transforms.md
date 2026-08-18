# 16 — Supabase Pro upgrade + verify transform pipeline

**What to build:** Upgrade the Supabase project to Pro (~1 week before the wedding, around 2026-09-13), flip the env flag to transform URLs in prod, and verify the gallery end to end: HEIC renders in Chrome/Firefox, oversize files use their fallback thumbnails, originals download intact.

**Blocked by:** 02 — Tracer, 09 — Client thumbnail fallback.

**Status:** ready-for-human

- [ ] Project on Pro; transform env flag on in prod
- [ ] HEIC upload renders in Chrome and Firefox via transforms
- [ ] >25MB file renders via fallback thumbnail
- [ ] Originals still byte-identical on download
