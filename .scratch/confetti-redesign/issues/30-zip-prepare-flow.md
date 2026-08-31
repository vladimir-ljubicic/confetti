# 30 — ZIP prepare flow: real counter, ETA, cancel (10a/10b)

**What to build:** Make the prepare→ready flow honest. Fixes ALIGN §1.2 ("0 од 0") and §1.7.

**Status:** ready-for-agent

- [x] Primary button label: `Преузми ZIP` → `Припреми ZIP` / `Prepare ZIP`
      (`src/lib/dictionaries.ts:314`, `:50`); `downloadNow` stays for 10c
- [x] Root cause of `0 од 0`: `ensureExportJob` returns null unless uploads are frozen
      (`src/lib/export-jobs.ts:112`) while the admin *Преузми све* bar is live pre-freeze —
      endpoint answers `202 {packing, 0, 0}` forever (`src/lib/export-endpoint.ts:26`,
      `src/app/export-download.tsx:93`). Allow the admin-kind job before the freeze
- [x] Packing card shows ETA `око N мин` — reuse `src/lib/upload-eta.ts` (unused here),
      warmup-gated like the bulk minibar
- [x] `Откажи припрему` destructive action: cancel route under `/api/export`, cancelled
      job state, card clears; must be safe against the self-rechaining build
      (`api/export/build/route.ts`)
- [x] Card body copy stays per README 13b (server-side, page can close)

Refs: drift-audit.md §1.2; ALIGN §2 10b.

## Comments

Implemented. `POST /api/export/{kind}` prepares (creates the job, or replaces a cancelled
one; admin kind allowed pre-freeze, public still frozen-gated → 409); `GET` stays the
status/download endpoint. `POST /api/export/admin/cancel` sets `cancelled` (409 with no
job); progress writes are conditioned on `job_id` + `packing`, so a running slice stops at
its next checkpoint and does not rechain. Jobs record `snapshot_frozen`; the freeze (cron
and admin toggle) replaces any job whose snapshot was taken while uploads were open, so a
ZIP prepared early never stands in for the frozen gallery. ETA is measured client-side
from watched progress (`packingEtaMs`, 10 s warmup). Preparing an already-ready ZIP shows
the ready card instead of forcing the download. Migration `0018_export_job_cancel.sql`
applied.

Deferred to 31 (ready-card lifecycle): a ready job is not re-seeded as the 10c card on
return — reaching it takes one tap through the sheet; dismissal memory needs the job
identity on the wire alongside expiry. Guest cards have no cancel (shared public build).
