# 42 — "Нове фотографије ↑" pill

**What to build:** Other guests' new photos never insert silently; a glass pill announces
them.

**Status:** done

- [x] Hold back rows arriving via the refocus refresh instead of merging straight into
      the rendered list (`src/app/use-full-gallery.ts:81-93` → `mergeGallery`)
- [x] Glass pill (same treatment as the like pill): `Нове фотографије ↑`; tap scrolls to
      top and merges; strings both locales
- [x] The guest's own optimistic tiles still enter immediately
- [x] Same rule during `router.refresh()` from the guest's own upload — own photos may
      appear, others' are held

Refs: ALIGN §2 6a; REVIEW §1; README 1a Loading.
