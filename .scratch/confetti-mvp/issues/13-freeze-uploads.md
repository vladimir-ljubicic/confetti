# 13 — Freeze/unfreeze uploads

**What to build:** An admin toggle (no fixed date) that stops all new uploads. While frozen, guests see a friendly notice and cannot start uploads; the gallery keeps working. Unfreezing restores uploads.

**Blocked by:** 10 — Admin auth.

**Status:** ready-for-agent

- [ ] Admin can toggle freeze on/off
- [ ] While frozen, upload attempts are rejected server-side and the UI explains why
- [ ] Browsing/downloading unaffected while frozen
