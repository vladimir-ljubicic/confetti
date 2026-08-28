# 01 — Design tokens + fonts

**What to build:** The redesign's foundation: color tokens, typography, radii, shadows,
spacing as Tailwind/CSS variables in `globals.css`, plus the two typefaces.

**Status:** done

- [x] All colors from the README token table (Paper `#faf6ee`, Card `#fffdf8`, Gold `#b08d3c`,
      Gold small `#8a6d2c`, Ink `#2b2620`, Stage `#1b1815`, etc.) as named tokens
- [x] Cormorant Garamond 400 italic + 500 via `next/font` (display, names, captions)
- [x] UI sans: Jost 300–500 via `next/font` (replaces Geist — never both)
- [x] Type scale per README (masthead 46px, h2 28–32px, sheet h3 29–30px, eyebrow 11–12px
      uppercase tracked, body 13–14px, meta 12px)
- [x] Radii (6/8/14/20px, `28px 28px 36px 36px` sheets, 999px pills) and the three shadows
- [x] Contrast rule encoded: 11–13px gold labels use `#8a6d2c`; `#b08d3c` only for 14px+
      labels and non-text fills

## Comments

Decided: use Jost (the design's font), drop Geist.
