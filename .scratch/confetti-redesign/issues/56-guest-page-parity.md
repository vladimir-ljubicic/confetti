# 56 — 11d parity with 11a: client-side chips + paging

**What to build:** The identical filter control behaves differently on the two admin
grids.

**Status:** done

- [x] 11d filter chips are `<Link href="?filter=…">` full server round-trips through
      `loading.tsx` (`admin/guests/[publicId]/page.tsx:139-146`); 11a filters client-side
      via `history.replaceState` (`admin-photo-grid.tsx:72-95`) — align 11d to 11a
- [x] 11d loads all of a guest's photos at once (no `.limit()`, `page.tsx:47-58`;
      `AdminPhotoGrid` called without `chips` disables paging) — page like 11a (30/page)

Refs: drift-audit.md §3.
