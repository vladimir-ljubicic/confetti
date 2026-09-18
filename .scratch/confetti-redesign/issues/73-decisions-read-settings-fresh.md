# 73 — Decisions read the event settings row, not the cache

**What to build:** Every place that acts on the event settings sees the row as it is at
that moment. The freeze cron decides "due or not" from the current event date and
offset; the upload endpoint refuses the first batch after the admin freezes; a ZIP
snapshot records the freeze state the row holds when the job is created; the admin page
shows the value the admin just saved. Gallery renders keep reading the cached copy.

**In plain words:**

1. The admin changes the event date, the offset or the freeze switch on the admin page;
   the row in the database is updated at once.
2. The next thing to ask "are uploads frozen?" for a decision — a guest's upload, the
   nightly freeze sweep, a ZIP build taking its snapshot — reads that row directly and
   acts on what the admin just saved.
3. Gallery pages keep serving the cached copy, which catches up on its own within a
   request or two; nothing a page shows is a decision.

Save, then decide on the saved row, then let the pages catch up.

**Blocked by:** None — can start immediately

**Status:** done

- [x] `src/lib/event-settings.ts` exposes a fresh read beside the cached one; the
      cached one is documented as render-only
- [x] `areUploadsFrozen` reads fresh, so the upload endpoint and export snapshots see
      the current row
- [x] `/api/cron/freeze` reads fresh
- [x] `/admin` reads fresh
- [x] Saving settings and hitting the cron in the very next request reports the saved
      state, not the previous one

## Comments

Found on 2026-09-18 while testing the freeze cron locally: backdating the event and
calling `/api/cron/freeze` at once returned `frozen:false`; the second call froze.
`unstable_cache` serves the old entry on the first read after `revalidateTag`, whatever
the profile passed — see `unstable-cache.js` in Next, "return stale immediately". The
`{ expire: 0 }` call the writer made never expired anything outright.

The same stale read could record `snapshot_frozen=false` on a ZIP job kicked right after
the admin toggles the freeze, which the next sweep would then replace and rebuild.
