# 40 — Summary card closes every batch (5c)

**What to build:** One ivory summary card after every batch, large or small.

**Blocked by:** 38, 39

**Status:** done

- [x] Small batches end silently today — only the bulk path sets a summary
      (`upload-button.tsx:755`; `startTileBatch` ends at `:508` with no card)
- [x] Actions become two stacked buttons: gold **Пробај поново** + outlined **Одбаци**
      (today one horizontal row, no Одбаци string; `upload-minibar.tsx:72`)
- [x] Failure line tappable: `3 нису успеле ▸ види које` → opens 5d (inert text today,
      `upload-minibar.tsx:76`)
- [x] Collect small-batch failures into the batch retry set (`retryBulkFailures` covers
      bulk only, `upload-button.tsx:543`)
- [x] Self-dismisses (bulk TTLs exist, `upload-button.tsx:32`; arm for small too)

Refs: ALIGN §2 5c.

## Comments

`BulkSummary` became `BatchSummary` and closes both paths: `showSummary` arms the
same TTLs (6s clean, 30s with failures) at the end of `startTileBatch` and
`startBulkBatch` alike, re-arms them when the 5d sheet closes, and stays away from a
batch the guest cancelled outright — nothing landed, nothing failed, nothing to close.
An aborted batch (frozen, limit, profile) still ends with its own notice instead. The
card states the running uploaded count, so it agrees with the sheet header after a
photo is retried from its tile.

A failure carries the tile it came from: `BatchFailureEntry.tileId`, null for a bulk
batch. `uploadTile` records into the same list the bulk path uses, so a small batch's
failures reach the summary line and the sheet, and `splitRetryTargets`
(`src/lib/batch-failures.ts`) sends each one back the right way — a tile retries in
place through `retryTile`, a bulk failure starts a fresh batch from its file. All three
upload loops now draw from one `runUploadPool`, so retries keep the three-at-a-time
ceiling. Изостави on a row takes the tile with it, and Одбаци clears the whole set.

The failure line counts every failure in the batch, retryable or not, so it agrees with
the sheet header it opens.

**14c (the rejected card) is gone.** After 38 a too-large photo in a small batch keeps
its tile and states its reason there; with the summary line now covering unretryable
failures too, the card only duplicated the count next to the summary. Its `rejected*`
and `rejectedTooLarge*` strings went with it. Reinstating it would mean deciding which
of the two cards owns the unretryable count.

The Додај фотографије button now hides only while a batch is uploading, not while the
summary card is up — a small batch's summary would otherwise take the button away for
up to 30 seconds. The design shows the card alone; the two gold pills now stack.

Both stacked actions are 44px tall rather than the design's 40/36, per ALIGN §0.
