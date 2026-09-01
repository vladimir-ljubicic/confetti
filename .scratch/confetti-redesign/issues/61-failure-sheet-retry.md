# 61 — Retry behaviour in the failure sheet (5d)

**What to build:** Retry runs *inside* the sheet. Today both retry paths call
`retryFailures`, which drops the rows from the list and hands the photos back to the
tiles / a fresh bulk batch, so the sheet empties and closes the moment retry starts
(`upload-button.tsx:375-395`, `failure-sheet.tsx:113-129, 180-200`). The design wants
the sheet to stay up and the shrinking list to be the progress indicator.

**Blocked by:** —

**Status:** done

## Row-level `Поново`

- [x] Retries that one photo only; the row **stays in place**, never re-sorts
- [x] Its button swaps for a small spinner + `Шаље се…`
- [x] On success the row fades and collapses out (~220ms), the header counters update
      (`13 нису отпремљене` / `87 успело`), the group heading decrements
      (`Можемо да пробамо поново · 11`), and the photo lands in the feed behind the sheet
- [x] On another failure the row returns with a refreshed reason carrying the attempt
      count — `Сервер није одговорио · 3 пробе`. No red flash; the text carries the news
- [x] An emptied group disappears; an emptied sheet closes itself (already true)

## `Пробај поново {N}`

- [x] Same operation across every row in the retryable group, 2–3 in flight
      (`CONCURRENT_UPLOADS = 3` already)
- [x] Button goes disabled and reads `Шаље се… 3/12`
- [x] `Одбаци` becomes `Откажи`: stops after the photo currently in flight and leaves the
      rest listed
- [x] Successful rows collapse out one by one — no extra progress bar
- [x] N always equals the still-retryable rows; rows under **Ово не можемо да отпремимо**
      are never counted and never touched (already true)
- [x] Run ends, all successful → brief toast `Све је отпремљено`, sheet closes
- [x] Run ends, some failing → button returns as `Пробај поново {N}` with the new count

## Dead-end group

- [x] A row with 3+ failed attempts moves down into a third group `Више пута није успело`
      with an **Изостави** button
- [x] Ordering: retryable · dead-end · unretryable

## Model / plumbing

- [x] `retryFailures` drops entries **before** the upload runs (`upload-button.tsx:383`),
      and a re-failure re-enters through `recordFailure` with a fresh id at the bottom of
      the group. That ordering is the main structural obstacle: the entry has to survive
      the attempt for the row to keep its place and its history
- [x] `BatchFailure` gains an attempt counter; `failureDetail` appends `· {n} пробе`
      (pluralized) once n ≥ 2. Issue 39 explicitly deferred this counter
- [x] Retry must upload from the sheet without routing through `retryTiles` /
      `startBatch`, so the row keeps its identity and the mini-bar / summary card stay out
      of it. Note `startBatch` sends >10 files down the bulk path
      (`upload-button.tsx:871-880`), so today a large retry-all silently turns into a
      bulk mini-bar run
- [x] Header counter is batch-scoped (`uploadedCount={batchUploaded}`,
      `upload-button.tsx:1027`) and bulk-path retries only bump it when the batch ends
      (`:844`) — it has to move per successful row
- [x] Rows need a fade + collapse exit (~220ms); no row-removal transition exists
- [x] New sr + en keys: sending (`Шаље се…`), sending-with-count, `Више пута није успело`,
      attempt-count plurals, `Све је отпремљено`. `Откажи` (`cancel`) exists
- [x] No toast component exists anywhere in `src/app` — the success toast is new
- [x] `groupFailures` returns two buckets and has unit tests
      (`src/lib/batch-failures.test.ts`); extend both for the dead-end bucket

Refs: ALIGN §2 5d ("Retry behaviour" paragraphs); supersedes the deferral noted in 39.

## Comments

Copy check: the retry-all button is `Пробај поново {count}` in the dictionary and in the
5d spec paragraph, but the new retry paragraph writes it `Пробај поново (N)` with
parentheses. Keeping the existing unparenthesized string unless told otherwise.

Deviation: the attempt count rides the **reason** line (`failureReason`), not
`failureDetail` — that is where both ALIGN and this ticket's own example put it
(`Сервер није одговорио · 3 пробе`), and the detail line already carries the
progress and the size.
