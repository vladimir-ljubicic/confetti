# 04 — Feed grid + floating upload button

**What to build:** Restyle the gallery grid per 1a: two flex columns (masonry stagger, no JS),
8px gap, 6px-radius tiles, **photos only** — no names/timestamps under tiles. Floating gold
upload pill sticky at `bottom: 24px` ("+ Додај фотографије"), grid `padding-bottom: 104px`.

**Blocked by:** 03

**Status:** done

- [x] 2-column staggered layout, `align-items: start`, varying tile heights
- [x] Tile tap opens viewer (12), avatar tap opens profile (13) — wire once those exist
- [x] Floating button: `pointer-events: none` wrapper / `auto` button, gold `#b08d3c`,
      16px/500 label, `16px 28px` padding, 999px radius

## Comments
