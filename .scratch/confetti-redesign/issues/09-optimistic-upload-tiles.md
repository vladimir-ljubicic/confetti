# 09 — Optimistic upload tiles, ≤10 photos (6a)

**What to build:** For batches of 1–10: local thumbnails inserted at the top of the grid
immediately as optimistic tiles. Never a blocking overlay; no filenames anywhere.

**Blocked by:** 04, 08

**Status:** done

- [ ] In flight: `rgba(43,38,32,0.34)` scrim, 44px conic-gradient progress ring, 34px inner
      disc with percentage, 44×44 "✕" top-right cancels that upload only
- [ ] Done: scrim/ring removed, like pill appears — tile becomes an ordinary gallery tile
      in place
- [ ] Failed: darker scrim + centred ivory "↺ Пробај поново" pill
- [ ] Cancelled: brief "Отказано · Врати" state, then tile disappears
- [ ] Photo visible to other guests only once fully uploaded (server already enforces via
      complete callback — verify)
- [ ] Upload queue state per spec: thumbnail blob URL, progress,
      `queued|uploading|done|failed|cancelled`

## Comments
