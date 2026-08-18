# 14 — Rate limits

**What to build:** Upload limits, all env-configurable: max 50 photos per batch, 100 uploads per 15 minutes per device, 60MB per file. No total cap per device. Admin devices are exempt. Exceeding a limit gives a clear message, not a silent failure.

**Blocked by:** 02 — Tracer, 10 — Admin auth.

**Status:** ready-for-agent

- [ ] Batch, per-device-window, and file-size limits enforced server-side with env-var config
- [ ] Guest sees a clear message when a limit is hit
- [ ] Admin-authenticated devices bypass all limits
