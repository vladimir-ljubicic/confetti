# 04 — First-upload dialog + one-tap batch uploads

**What to build:** On a device's first upload, a dialog asks for a mandatory free-text display name and a public/private **default** visibility; both are stored against the device token. Every later upload is one tap using that stored default — no per-batch visibility choice. Guests can multi-select photos from their library (HEIC accepted as-is); the batch uploads with progress feedback.

**Blocked by:** 02 — Tracer, 03 — i18n.

**Status:** ready-for-agent

- [ ] First upload cannot proceed without a display name
- [ ] Chosen default visibility applies to that and all later uploads
- [ ] Second upload from the same device shows no dialog — one tap
- [ ] Multi-select batch uploads work with per-file progress
