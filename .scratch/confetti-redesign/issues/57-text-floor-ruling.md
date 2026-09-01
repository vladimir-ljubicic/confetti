# 57 — Ruling: muted-text opacity + size floor

**Status:** resolved

**Question:** enforce ALIGN §0's global floor (opacity ≥ `rgba(43,38,32,0.55)`, nothing
below 12px) or accept the board's own values (11px eyebrows/meta everywhere, 0.45
wordmark, 10px badges)? The spec contradicts itself; the code follows the board.

One ruling beats ~12 local fixes. If the floor wins, the inventory to touch (from
drift-audit.md §3): wordmark `ink/45` 11px, empty-state footnote `ink/45`, intro-sheet
labels `ink/45–50`, admin rows `ink/50`, ~10 sites of 11px meta, 10px Приватна badges.
REVIEW §6 (WCAG AA on ivory) argues for the floor; the ceremonial 11px eyebrows argue for
a carve-out for uppercase tracked labels.

## Answer

Neither literally. Contrast wins, the pixel sizes do not, and the floor sits where AA
actually is rather than where ALIGN §0 guessed it was.

Measured on `#faf6ee`: ink `0.45` = 2.66:1, ink `0.55` = 3.45:1. ALIGN §0's own floor fails
the WCAG AA that REVIEW §6 cites as its reason, so enforcing it as written would have been a
whole-app sweep to a value that still fails.

Recorded in `docs/adr/0007-muted-text-floor.md`; **Muted text** defined in `CONTEXT.md`.

- `--color-ink-muted: rgba(43,38,32,0.68)` — the lightest ink clearing 4.5:1 on every ivory
  surface the app sets text on, not just the page. The binding surface is the admin tab
  strip's `sand-deep` track, which `0.67` misses at 4.49:1; a test asserts that, so the
  value cannot drift down. Mirrors the existing `gold`/`gold-small` split.
- 77 sites across 36 files collapsed onto the token. Far more than the ~12 the audit listed,
  because `ink/60` (4.01:1) and `ink/62` (4.11:1) fail too. `ink/70` and `ink/75` clear AA
  and stay as hierarchy.
- The masthead hairline rules now state their own alpha (`bg-ink/30`) instead of inheriting
  it from a `text-ink/30` on the row, so no ink under the floor is set on text anywhere.
- Three 11px eyebrows moved from `gold` (2.90:1) to `gold-small` (4.53:1).
- The admin guest-row chevron moved up with the words: it is the only mark saying the row
  navigates, so the floor covers it.
- No size floor. 11px uppercase tracked eyebrows and the 10px Приватна badge stay; the badge
  sits on `rgba(27,24,21,0.72)`, far above AA. Dark-surface text (viewer, scrub rail) is
  outside the token.
- `src/lib/contrast.ts` + `contrast.test.ts` read the palette out of `globals.css`, hold
  muted ink above AA on every ivory surface, hold the other text colours above AA on the page
  and raised surfaces, and fail on any `text-ink` utility under the floor in `src/app`.
  Verified by mutation: both a lowered token and a reintroduced `text-ink/45` break the
  build.

Known residuals, both in the ADR:

- The masthead's italic conjunction is `gold` at 31px = 2.90:1, just under the 3:1 AA asks
  at that size. Left alone as the masthead's signature.
- `gold-small` clears AA on the page and raised surfaces but drops to 4.07:1 on sunken ones,
  which every pill button presses to. Found while ruling this and left out of it — it is the
  handoff's own `gold deep` hex, so changing it is its own decision. Filed as issue 63, which
  is what widens the guard to every colour on every surface.
