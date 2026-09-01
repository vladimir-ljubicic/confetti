# 55 — Tap targets + off-vocabulary radii

**What to build:** ALIGN §0: every tappable target ≥44px (pad, don't grow the label).

**Status:** resolved

- [x] Wordmark home link: ~28px box today (`confetti-wordmark.tsx:7`, `-m-1.5 p-1.5`)
- [x] Guest-bar back link: ~31px (`guest-bar.tsx:51`) — apply the `min-h-11` pattern the
      admin back link already uses (`admin-chrome.tsx:39`)
- [x] Offline banner's `Пробај сада`: 40px per the board, under the 44px floor
      (`offline-notice.tsx:50`, `h-10`)
- [x] Frozen notice on the empty state: `rounded-lg` (8px, thumbnail radius) on a text
      block → 14px card (`empty-gallery.tsx:107`)

(Не дирати: 9b rename inputs are 10px per README 9b; profile action bar 18px per README
8a — both board-sourced.)

Refs: ALIGN §0, §3 Accessibility.
