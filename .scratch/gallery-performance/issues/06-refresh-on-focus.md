# 06 — Refresh on focus

**What to build:** New photos and like-counts appear only on full reload
today. Agreed freshness budget is ~30s, without realtime plumbing.

**Status:** done

- On `visibilitychange` → visible (and window `focus`), refetch the metadata
  list (issue 03's endpoint) if the last fetch is older than 30s; merge by
  photo id.
- Scroll position and the open viewer survive a merge; a photo deleted
  server-side leaves the array and its tile unmounts.
- Like-counts refresh with the same fetch — Popular stays as-of-load between
  refreshes by design.
- No polling while the tab stays visible; the optimistic-upload flow already
  covers the guest's own additions.

## Acceptance

- [x] Backgrounding the tab, uploading from a second device, and returning
      shows the new photo without reload
- [x] Refocusing within 30s makes no request
- [x] Open viewer and scroll position unaffected by a merge
