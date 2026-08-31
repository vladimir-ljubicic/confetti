# 31 — ZIP ready state: link validity (10c)

**What to build:** The ready card states and enforces link expiry.

**Status:** ready-for-human

- [x] Line `184 фотографије · линк важи до DD.MM.` (only count renders today,
      `src/app/export-download.tsx:208`); both locales
- [x] 7-day validity: store expiry on the job; today the stable link never expires —
      signed URL is 24h but re-minted per request (`src/lib/export-jobs.ts:27`,
      `src/lib/export-endpoint.ts:40`)
- [x] Purge expired ZIP objects + jobs (cron; `api/cron/purge` covers photos only)
- [x] Card `expired` state after the deadline

Refs: ALIGN §2 10c; drift-audit.md §3.

## Comments

Implemented. `export_jobs.expires_at` (migration 0019, applied) is set to ready + 7 days
when packing finishes; `resolveExportState` derives `expired` from it so the deadline
holds before the nightly purge runs. Endpoint answers 410 with JSON status once expired;
signed URL TTL is capped at the remaining validity. `api/cron/purge` now also removes
expired ZIP objects and marks their jobs `expired` (row kept, like `cancelled`, so a
probe sees the expiry instead of resurrecting the build); prepare replaces an expired
job. Ready card renders `N фотографије · линк важи до DD.MM.` (Belgrade date); Download
now probes first and swaps to the expired card when the link is dead. Validity runs
through the end of the seventh Belgrade day after ready, so the date shown is the last
working day. The expired card is reached from an open ready card (Download now); on a
fresh visit after the deadline the sheet simply offers Prepare again, as for cancelled.
