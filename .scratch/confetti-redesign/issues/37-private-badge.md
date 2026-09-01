# 37 — `Приватна` badge: top-left, one component

**What to build:** ALIGN §1.5. Size/padding/colour are already right; position is wrong
and there are two divergent copies.

**Status:** ready-for-agent

- [x] Top-left (both grids bottom-left today: `admin/admin-photo-grid.tsx:153`,
      `my-photos/profile-view.tsx:478`)
- [x] One shared badge: 10px text, 3×7px padding, `rgba(27,24,21,0.72)`, `#faf6ee` text —
      my-photos copy drifts to `0.7` + stray `tracking-[0.06em]`

Refs: ALIGN §1.5, §2 11a.
