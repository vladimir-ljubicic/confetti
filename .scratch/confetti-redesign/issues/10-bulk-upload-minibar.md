# 10 — Bulk upload mini-bar + summary, >10 photos (6b, 6c)

**What to build:** For batches over 10: no per-file tiles. One sticky mini-bar at the bottom
(current thumbnail, "Отпремање N од M", ETA, progress track, 44px "Откажи", keep-page-open
hint). On finish it becomes the 6c summary card ("97 фотографија отпремљено" / "3 нису
успеле" + gold retry-failures pill, self-dismisses).

**Blocked by:** 09

**Status:** done

- [x] Mini-bar geometry/styles per 6b spec; fully non-blocking (scroll, like, open photos)
- [x] `navigator.wakeLock` requested for the duration of the batch, released after
- [x] Gallery refreshes incrementally, roughly every 10 completions — not once at the end
- [x] 6c retry re-attempts only the failures

## Comments
