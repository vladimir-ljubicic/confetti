# 19 — Gallery pagination / photo cap

**What to build:** The gallery loads at most 200 photos per view. With ~200 guests the wedding will exceed that: in chronological mode (ascending) everything after the 200th-earliest photo is unreachable; in live feed everything older than the 200th-newest. Each rendered photo also costs a signed-URL call per page view, so simply raising the limit scales that cost. Add pagination (or infinite scroll) so all public photos stay reachable in both sort modes.

**Blocked by:** 07 — Sort modes: live feed / chronological + EXIF capture.

**Status:** needs-triage

- [ ] All public photos reachable in both sort modes
- [ ] Per-view signed-URL count stays bounded
