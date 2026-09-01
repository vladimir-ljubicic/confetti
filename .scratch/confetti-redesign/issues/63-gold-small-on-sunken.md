# 63 — `gold-small` drops under AA on the sunken surfaces

**Status:** needs-info

`--color-gold-small` (`#8a6d2c`) is the palette's small-text gold: 4.53:1 on ivory page and
4.80:1 on raised, both clear of WCAG AA. On the surfaces below the page it is not:

| surface | | ratio |
|---|---|---|
| ivory page | `#faf6ee` | 4.53 ✓ |
| ivory raised | `#fffdf8` | 4.80 ✓ |
| ivory alt | `#f4efe4` | 4.25 ✗ |
| ivory hover | `#f7f0df` | 4.29 ✗ |
| ivory sunken | `#f1eadb` | 4.07 ✗ |
| sand deep | `#e7dfcd` | 3.68 ✗ |

Reached on every press: the pill buttons in `select-entry.tsx:21`, `error-screen.tsx:41`,
`export-download.tsx:386`, `back-to-top.tsx:33`, `download-all-button.tsx:72`,
`download-mine.tsx:74`, `offline-notice.tsx:50`, `failure-sheet.tsx:47`,
`select-mode.tsx:354` and `upload-minibar.tsx:114` all carry `gold-small` text with
`hover:bg-gold-tint` / `active:bg-sand`, so the label dips below AA for the duration of the
touch. `admin-tabs.tsx:59` puts the active tab's `gold-small` on `bg-card` (fine); its
strip is `bg-sand-deep`.

Found while ruling issue 57, and deliberately left out of it: ADR-0007 rules on muted ink,
and `gold-small` is the handoff's own `gold deep #8a6d2c` under another name, so darkening
it is a change to a given token rather than an application of the ruling.

**Question:** darken `gold-small` until it clears AA on `sand-deep` (needs roughly `#6f5623`,
which is close enough to `gold-deep #7a5f24` that the two may want merging), or hold the
handoff's hex and accept that a pressed pill's label is under AA while the finger is down?

Whichever way it goes, `contrast.test.ts` should end up asserting every text colour across
every ivory surface rather than the page and raised ones only; it is scoped down today with
a comment pointing here.
