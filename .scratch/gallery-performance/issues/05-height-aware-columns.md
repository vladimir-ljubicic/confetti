# 05 — Height-aware column dealing

**What to build:** `photo-grid.tsx` deals tiles to its two columns by index
parity, so one column can run visibly longer and neighbouring tiles drift out
of upload order. Deal each tile to the currently shorter column instead.

**Status:** done

- Greedy placement on cumulative column height, computed from
  `image_width`/`image_height` (fallback aspect included) — deterministic, so
  SSR and hydration agree without measurement.
- Preserves the design-handoff look (two columns, 8px gap, staggered bottoms);
  tightens visual order so the newest photos stay adjacent at the top.
- Must compose with the virtual window (issue 03): placement derives from the
  full ordered list, not the rendered slice.

## Acceptance

- [x] Bottom-of-column height difference stays within one median tile across
      the seed
- [x] No hydration mismatch warnings
- [x] Order reads left-right/top-down within a viewport
