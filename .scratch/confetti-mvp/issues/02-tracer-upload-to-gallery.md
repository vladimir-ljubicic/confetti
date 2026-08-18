# 02 — Tracer: upload one photo → see it in gallery

**What to build:** A guest opens the site, gets a random device token on first visit, picks one photo, and it uploads browser → Supabase Storage directly via a signed resumable (TUS) upload — Vercel never touches file bytes. The photo appears in a public gallery grid, rendered through an image-URL helper with an env flag switching transform URLs (Pro) vs original URLs (dev). Tapping a photo lets anyone download the untouched original (EXIF intact). Page shows the "Jelena & Vladimir" title in the gold/ivory palette.

**Blocked by:** 01 — Provision Supabase + Vercel.

**Status:** ready-for-agent

- [ ] First visit issues a persistent device token; upload is attributed to it
- [ ] Upload goes direct to Supabase Storage via signed TUS URL; original stored untouched
- [ ] Gallery grid shows the photo via the URL helper; env flag flips transform/original
- [ ] Downloaded original is byte-identical to the uploaded file
- [ ] HEIC upload accepted (renders via transform when the flag is on)
