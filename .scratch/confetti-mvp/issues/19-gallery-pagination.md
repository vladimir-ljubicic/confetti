# 19 — Gallery pagination / photo cap

**What to build:** The gallery loads at most 200 photos per view. With ~200 guests the wedding will exceed that: in chronological mode (ascending) everything after the 200th-earliest photo is unreachable; in live feed everything older than the 200th-newest. Each rendered photo also costs a signed-URL call per page view, so simply raising the limit scales that cost. Add pagination (or infinite scroll) so all public photos stay reachable in both sort modes.

**Blocked by:** 07 — Sort modes: live feed / chronological + EXIF capture.

**Status:** done

- [x] All public photos reachable in both sort modes
- [x] Per-view signed-URL count stays bounded

## Comments

Keyset cursor pagination, 30 photos per page, appended by an IntersectionObserver
sentinel below the grid and by swiping near the end of the photo viewer. The cursor is
`(like_count, uploaded_at, id)`; each sort orders by its own prefix of that key and ends
on the id so pages can't overlap or skip. `GET /api/photos?sort&cursor&uploader` serves
the pages after the server-rendered first one.

Sorting moved back to the server (the toggle navigates): re-sorting one page in the
browser was wrong once the gallery outgrew a page. The masthead count is now an exact
gallery-wide count rather than the number of rows rendered.

Verified against 130 seeded photos: both sorts walk 3 pages, 130 unique rows, in the
same order the sort key defines.
