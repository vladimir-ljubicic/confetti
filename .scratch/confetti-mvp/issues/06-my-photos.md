# 06 — My photos page

**What to build:** A device-token-scoped "My photos" page where a guest sees all their own uploads including private ones, toggles visibility per photo, changes their upload default, and deletes their own photos. Deletes are soft: the photo disappears from all guest-facing views but is retained for a 30-day recycle bin.

**Blocked by:** 05 — Visibility enforcement.

**Status:** ready-for-agent

- [ ] Page lists only the device's own uploads, private included
- [ ] Per-photo public/private toggle takes effect in the gallery immediately
- [ ] Guest can change their default visibility for future uploads
- [ ] Delete removes the photo from all guest views but keeps it (soft delete)
