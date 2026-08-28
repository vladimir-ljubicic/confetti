# 25 — Configurable event date + freeze offset

**What to build:** Move the hardcoded event date and freeze moment into data. Automatic
freeze = event date + N days; both configurable from admin.

**Status:** done

Server:
- [x] Migration: `event_settings` gains `event_date date` and `freeze_offset_days int`
      (defaults: current values — 2026-09-20 / 7)
- [x] `src/lib/event-settings.ts`: read/write the new fields; derive the freeze moment
      (midnight Europe/Belgrade after `event_date + freeze_offset_days`, matching current
      `UPLOAD_FREEZE_AT` behavior)
- [x] `/api/cron/freeze` reads the derived freeze moment from DB instead of
      `UPLOAD_FREEZE_AT`
- [x] Delete `src/lib/event-date.ts` constants once nothing references them (masthead
      date line included — source it from `event_date`)

Admin:
- [x] Two small fields in admin settings (next to the freeze toggle): event date +
      offset days; `PATCH /api/admin/settings` extended and validated
- [x] Manual freeze toggle keeps working; no override flag — cron re-freezes at the next
      run whenever the derived freeze moment has passed, so reopening = unfreeze **and**
      extend date/offset
- [x] Compact bar's "20.09.2026 · N" also sourced from `event_date` (same formatter as
      the masthead; both display formats unchanged)

## Comments

Decided: DB + admin UI, not env constants — diff's "admin not changed" yields to
configurability here.

Decided (grilling 2026-08-28): the earlier "overrides the schedule (as today)" wording
was wrong — today's code has no override; cron and the toggle write the same boolean and
cron never un-freezes. Kept that model deliberately: no override flag, changing the date
never auto-unfreezes, reopening is unfreeze + extend window. Validation follows the
existing hand-written parser pattern (`upload-freeze.ts` style): valid date + int
offset ≥ 0.
