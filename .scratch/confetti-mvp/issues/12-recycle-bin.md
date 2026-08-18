# 12 — Recycle bin

**What to build:** Soft-deleted photos land in an admin-visible recycle bin for 30 days, where admins can restore them. After 30 days they are permanently purged (rows and storage objects).

**Blocked by:** 06 — My photos page, 10 — Admin auth.

**Status:** ready-for-agent

- [ ] Deleted photos appear in the admin recycle bin with deletion time
- [ ] Restore returns a photo to its prior state and views
- [ ] Photos older than 30 days in the bin are purged permanently
