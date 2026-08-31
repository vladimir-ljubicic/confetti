# 34 — Select mode on admin grids (11a, 11d)

**What to build:** Admin has no select mode at all — tiles are onClick-only
(`src/app/admin/admin-photo-grid.tsx:136`), no long-press, no selection state, no bulk bar.

**Blocked by:** 33

**Status:** ready-for-human

- [x] Long-press + the Изабери-pill block (from 33) on 11a and 11d
- [x] Selection circles on tiles, bulk action bar (Сакриј / Обриши over the selection),
      same treatment as 8b
- [x] Respects the active filter chip

Refs: ALIGN §1.3, §2 11a/11d.

## Comments

- While selecting, the page's bottom controls (11a freeze block + ZIP row, 11d guest
  settings) are unmounted so the pinned action bar does not float over a sticky footer.
  Deliberate; 8b has no footer so the design is silent here.
- 11d filter chips are now client-side (same grid, `?filter=` kept via replaceState) so a
  chip tap keeps select mode instead of navigating out of it.
