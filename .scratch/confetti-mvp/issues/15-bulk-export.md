# 15 — Bulk export

**What to build:** Admins download one zip of all originals including private photos, organized as a folder per uploader display name, filenames prefixed with the photo's taken-timestamp (upload time when EXIF is missing).

**Blocked by:** 11 — Admin photo management.

**Status:** ready-for-agent

- [ ] Zip contains every non-deleted photo incl. private, as untouched originals
- [ ] One folder per uploader name; filenames prefixed with taken-timestamp
- [ ] Works at wedding scale (~200 guests' uploads) without timing out
