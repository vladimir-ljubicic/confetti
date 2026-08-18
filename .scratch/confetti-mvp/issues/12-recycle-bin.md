# 12 — Recycle bin

**What to build:** Soft-deleted photos land in an admin-visible recycle bin for 30 days, where admins can restore them. After 30 days they are permanently purged (rows and storage objects).

**Blocked by:** 06 — My photos page, 10 — Admin auth.

**Status:** ready-for-human

- [x] Deleted photos appear in the admin recycle bin with deletion time
- [x] Restore returns a photo to its prior state and views
- [x] Photos older than 30 days in the bin are purged permanently

## Comments

- Implemented as `/admin/bin` (linked from the admin header when signed in):
  lists soft-deleted photos newest-deleted first with uploader name and
  locale-formatted deletion time; restore calls
  `POST /api/admin/photos/[id]/restore` (admin-only, clears `deleted_at` only,
  so visibility and views come back untouched). Purge runs via Vercel cron
  (`vercel.json`, daily 03:00 UTC) hitting `GET /api/cron/purge` guarded by a
  `CRON_SECRET` bearer token: photos with `deleted_at` older than 30 days
  (`RECYCLE_RETENTION_DAYS` in `src/lib/recycle-bin.ts`) get their storage
  objects (original + thumbnail) removed first, rows deleted after — a storage
  failure leaves rows for the next run, and the row delete re-asserts the
  cutoff so a photo restored mid-run keeps its row. Migration
  `0006_recycle_bin_index.sql` adds a partial index on deleted photos.
- One-time steps: set `CRON_SECRET` in Vercel project env (Vercel injects it
  into cron request auth headers automatically) and locally in `.env.local`;
  apply migration 0006. Note `.gitignore` excludes `.env*`, so the
  `.env.example` addition documenting `CRON_SECRET` is untracked.
- Review note (accepted): the bin page loader repeats the select→cast→
  `galleryImageUrl` shape of `loadAllPhotos` and `public-photos`; the three
  select different columns, so a shared parameterized loader was judged not
  worth the abstraction yet.
- Known race (accepted, ms-wide window): a restore landing between the purge's
  storage removal and row delete keeps the row but the object is already gone,
  leaving a broken image; the cutoff re-assert prevents the worse outcome of
  silently destroying a restored row.
