# 07 — Bounded, resumable rendition moves

**What to build:** Bulk visibility changes move renditions between buckets a
few at a time, in batches per request, with progress on screen — and any
rendition left in the wrong bucket gets moved by a nightly job. See ADR-0005's
consequences for the storage-service limit this answers.

**Status:** done

- `moveRenditions` runs at most four moves in flight, retries `SlowDown`
  (429/503) with exponential backoff, and reports which photos have every
  rendition in place and which do not.
- `hide-all` and `restore-all` handle 40 photos per request and answer
  `{ done, remaining }`; the admin UI (`useBulkAction`) keeps calling until
  nothing remains, showing `{done} of {total}` in the button. A failed request
  keeps the count on screen; the button runs again from where it stopped.
- Every route moves renditions first and changes rows only for the photos
  whose renditions are in place, so a failure is resumable by running the
  action again.
- `rendition_mismatches(max_rows)` lists photos whose thumb or viewer sits in
  the other bucket from the one the row calls for; the
  `/api/cron/reconcile-renditions` job moves up to 100 of them a night.

## Acceptance

- [x] Hiding a 250-photo guest completes, with progress, on the free-tier dev
      project where the previous single burst of 500 moves failed.
- [x] A request that fails part-way leaves every row consistent with where its
      renditions are.
- [x] Unit tests cover the concurrency cap, retry, give-up, and partial
      outcomes.
