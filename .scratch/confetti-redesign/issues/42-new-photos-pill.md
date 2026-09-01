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

## Comments

A pill admits only the photos it announced. `reveal` takes them rather than
emptying `held`: on a guest's gallery the pill counts that guest's held photos,
so admitting every held photo let the rest of the gallery in behind it — and
the way back out restores its old scroll offset, dropping them in above the
reader with no pill and no scroll to the top. `admitPhotos` in `gallery-head.ts`
is the union, and `gallery-view.tsx` hands the pill the held photos its own
grid would show.
