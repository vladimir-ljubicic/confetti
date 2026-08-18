# 11 — Admin photo management

**What to build:** Admins see every photo including private ones, each labeled with its uploader's name, with filter/group-by-uploader and per-uploader counts. Admins can delete any photo, change any photo's visibility, and edit uploader display names.

**Blocked by:** 05 — Visibility enforcement, 10 — Admin auth.

**Status:** ready-for-human

- [x] Admin view lists all photos incl. private, with uploader names
- [x] Filter/group by uploader with per-uploader counts
- [x] Admin can delete any photo, edit any photo's visibility, rename any uploader

## Comments

Known gap (accepted): rename is only reachable from a photo group header, so an
uploader with zero visible photos (profile saved but nothing uploaded, or all
photos soft-deleted) has no rename UI. The API (`PATCH
/api/admin/uploaders/[publicId]`) supports it; recycle bin (ticket 12) will
surface soft-deleted photos and close most of this gap.
