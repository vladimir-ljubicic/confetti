# 41 — Offline banner: ivory with red words (13b)

**What to build:** v3 dropped the pink surface; the build still ships the v2 design.

**Status:** done

- [x] Ivory surface, red `!` and red `Нема интернета` in `#9d4b4b` — no pink
      (today `bg-warning-bg` `#f7e9e3` + brown-orange `#8a4b2c`,
      `src/app/offline-notice.tsx:32-50`, tokens `globals.css:21-22`)
- [x] Retire or repurpose `warning-bg`/`warning-text` tokens (v2 leftovers) —
      ALIGN §0: danger is words only, never a tinted surface
- [x] Body copy and `Пробај сада` unchanged

Refs: ALIGN §2 13b, §0.
