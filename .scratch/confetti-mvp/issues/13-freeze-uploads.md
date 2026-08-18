# 13 — Freeze/unfreeze uploads

**What to build:** An admin toggle (no fixed date) that stops all new uploads. While frozen, guests see a friendly notice and cannot start uploads; the gallery keeps working. Unfreezing restores uploads.

**Blocked by:** 10 — Admin auth.

**Status:** ready-for-human

- [x] Admin can toggle freeze on/off
- [x] While frozen, upload attempts are rejected server-side and the UI explains why
- [x] Browsing/downloading unaffected while frozen

- Freeze state lives in a single-row `event_settings` table (migration 0007);
  apply it before deploying.
- In-flight uploads that already hold a signed URL when the freeze lands may
  still complete (accepted): the freeze gates ticket issuance, not the
  `complete` callback, so guests never lose a photo mid-transfer.
- The gallery read of the flag fails open so browsing survives a settings
  outage; the uploads API fails closed (500) on the same error.
