# 25 — Configurable event date + freeze offset

**What to build:** Move the hardcoded event date and freeze moment into data. Automatic
freeze = event date + N days; both configurable from admin.

**Status:** ready-for-agent

Server:
- [ ] Migration: `event_settings` gains `event_date date` and `freeze_offset_days int`
      (defaults: current values — 2026-09-20 / 7)
- [ ] `src/lib/event-settings.ts`: read/write the new fields; derive the freeze moment
      (midnight Europe/Belgrade after `event_date + freeze_offset_days`, matching current
      `UPLOAD_FREEZE_AT` behavior)
- [ ] `/api/cron/freeze` reads the derived freeze moment from DB instead of
      `UPLOAD_FREEZE_AT`
- [ ] Delete `src/lib/event-date.ts` constants once nothing references them (masthead
      date line included — source it from `event_date`)

Admin:
- [ ] Two small fields in admin settings (next to the freeze toggle): event date +
      offset days; `PATCH /api/admin/settings` extended and validated
- [ ] Manual freeze toggle keeps working and overrides the schedule (as today)

## Comments

Decided: DB + admin UI, not env constants — diff's "admin not changed" yields to
configurability here.
