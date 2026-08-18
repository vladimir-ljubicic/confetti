# 14 — Rate limits

**What to build:** Upload limits, all env-configurable: max 50 photos per batch, 100 uploads per 15 minutes per device, 50MB per file. No total cap per device. Admin devices are exempt. Exceeding a limit gives a clear message, not a silent failure.

**Blocked by:** 02 — Tracer, 10 — Admin auth.

**Status:** ready-for-human

- [x] Batch, per-device-window, and file-size limits enforced server-side with env-var config
- [x] Guest sees a clear message when a limit is hit
- [x] Admin-authenticated devices bypass all limits

## Comments

- Limits live in `src/lib/upload-limits.ts` (env parsing + pure evaluation);
  the uploads API enforces them before signing, skipped when the request
  carries a valid admin cookie.
- The per-device window counts `photos` rows by `created_at`, so soft-deleted
  and never-completed uploads still count as attempts.
- The batch limit is enforced against a client-declared `batchSize` (uploads
  are one request per file, so the server cannot observe the batch itself);
  the client also blocks oversize selections before uploading. The per-window
  limit backstops a client that lies.
- Oversize files fail individually with a per-file message; batch/window hits
  stop the remaining queue and show a notice.
- The window check is count-then-insert, not atomic: parallel requests can
  overshoot the cap by roughly the client's upload concurrency (3). Accepted —
  the cap is a throttle, not a quota.
- The file-size check trusts the client-declared size; a lying client can push
  a bigger file through the signed tus URL. A storage-level bucket cap would
  close this but would also apply to admins, breaking the exemption, so it is
  accepted; the window limit bounds abuse volume.
