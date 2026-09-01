# 54 — Motion polish: tile entrances + skeletons

**What to build:** Three REVIEW §1 "deliberately not doing" violations.

**Status:** done

- [x] `tile-in` only for genuinely new tiles — today every `<li>` re-animates when the
      virtualization window remounts it, a continuous fade-on-scroll
      (`photo-grid.tsx:416-418`; only `absorbedTiles` is exempt)
- [x] 40ms page stagger: `enterOrder` is computed but read by no one
      (`use-photo-feed.ts:68-76`) — wire it as `animation-delay` on arriving pages, or
      delete the dead code
- [x] Flat skeletons: drop `animate-pulse` (`grid-skeleton.tsx:24`,
      `my-photos/loading.tsx:34`, `admin/skeleton.tsx:4,17,29,42`) — flat `#f1eadb`
      blocks that cross-fade out

Refs: REVIEW §1; ALIGN §3 Motion.
