# 06 — My photos page

**What to build:** A device-token-scoped "My photos" page where a guest sees all their own uploads including private ones, toggles visibility per photo, changes their upload default, and deletes their own photos. Deletes are soft: the photo disappears from all guest-facing views but is retained for a 30-day recycle bin.

**Blocked by:** 05 — Visibility enforcement.

**Status:** ready-for-human

- [x] Page lists only the device's own uploads, private included
- [x] Per-photo public/private toggle takes effect in the gallery immediately
- [x] Guest can change their default visibility for future uploads
- [x] Delete removes the photo from all guest views but keeps it (soft delete)

## Comments

- Implemented as `/my-photos` (linked from the gallery header when the device
  has a profile): server page lists the device's completed, non-deleted
  uploads; per-photo controls call `PATCH`/`DELETE /api/photos/[id]`
  (owner-checked via the device cookie), the default-visibility picker calls
  `PATCH /api/profile`. Soft delete sets `deleted_at`; the row and storage
  object are retained (bin UI is ticket 12).
- Verified end-to-end against the live project with a fresh device: private
  photo listed with badge on own page, absent for other devices; foreign-device
  PATCH 403s; toggle persisted to `visibility = 'public'`; delete set
  `deleted_at` and further PATCHes 404; default flip private → public
  persisted. Smoke rows cleaned up afterwards.
- Ticket 05's signed-URL caveat stands: a photo flipped public → private (or
  deleted) stays fetchable via an already-issued signed URL for up to 1h.
  Accepted for now; revisit with admin/visibility hardening if needed.
