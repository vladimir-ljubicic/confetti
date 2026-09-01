# 39 — Failure-details sheet (5d)

**What to build:** New screen; nothing exists (no component, no copy, no data model).

**Blocked by:** 38

**Status:** done

- [x] Sheet capped at 82% height: pinned header (`14 нису отпремљене` · `86 успело`),
      scrolling list, pinned action bar (Одбаци + gold `Пробај поново 12`)
- [x] Rows identified by thumbnail, never filename; grouped
      **Можемо да пробамо поново · N** (reason, progress/size, outlined **Поново**) vs
      **Ово не можемо да отпремимо · N** (red *words*, ivory row surface, outlined
      **Изостави**)
- [x] Uses `useSheetDismiss` (drag + back-closes) like the other sheets

Refs: ALIGN §2 5d.

## Comments

Built as `src/app/failure-sheet.tsx` over a `BatchFailure` model in
`src/lib/batch-failures.ts`: one list per batch holding every photo that did not
go up, with its preview, reason, size and how far it got. `upload-button.tsx`
now keeps that single list where it kept a bulk-failure array and a separate
rejection array, so the unretryable card and the sheet read the same store.

Row detail follows the ticket's "progress/size": `Отпремљено 60% · 4,1 MB`,
`62 MB · највише 40 MB`, or `Неподржан формат`. The design's `2 пробе` variant
would need an attempt counter and was left out.

The sheet's only way in for now is the summary card's failure line. Its copy
(`▸ види које`), the stacked action buttons and collecting small-batch failures
belong to 40 — until then a photo retried from a row and failing again states
its reason on its tile rather than returning to the list.
