# 65 — The viewer opens on a fade again, not a zoom

**What to build:** Opening and closing a photo is the fade the app had before the
redesign put a shared-element zoom in its place: the stage fades up over the gallery
and the photo scales into it, and the reverse on the way out. The zoom goes, and every
part built to serve it goes with it.

**Status:** done

- [x] Every viewer — a tapped tile, an addressed photo (`?photo=`), the admin grid,
      my-photos — opens and closes on `viewer-in` / `viewer-photo-in` and their
      `-out` pair, on one path with no second style behind a capability check
- [x] A tile keeps its photo while the viewer stands over it; no tile is emptied
- [x] No element carries a per-photo `view-transition-name`, so a swipe logs no
      duplicate-name error
- [x] The dismiss drag flings the photo off screen in the drag's direction again
- [x] `photo-zoom.tsx` and `lib/view-transition.ts` are gone, along with the
      `zooms` / `zoomId` plumbing through the grid and the viewer
- [x] The `.photo-zoom` and `.viewer-stage` view-transition rules leave `globals.css`
- [x] `CONTEXT.md` no longer defines a photo zoom, and the terms that lean on it
      — viewer session, viewer dismiss — read without it
- [x] Locale switch and admin tabs keep their own view transitions, untouched

## Comments

The zoom came in with [48](48-shared-element-zoom.md) and has cost more than it
returned: the wrong slide deep in the gallery ([64](64-viewer-lands-on-the-wrong-slide.md)),
two elements answering to one photo's name at once, and a ground that cut to the stage
in a single frame rather than giving way. Each was answered, and the transition still
reads wrong: one large thing crossing the screen where the fade simply arrived.

The fade never left — it has stood the whole time as the path for a browser without
View Transitions, for an addressed photo, and for the admin and my-photos viewers. This
is not writing an animation back; it is deleting the branch that stood beside it.

[64](64-viewer-lands-on-the-wrong-slide.md) stands on its own — the slide arithmetic it
fixed is what puts the tapped photo on the stage, zoom or no zoom.

The fade was never written back, only uncovered: `viewer-in` / `viewer-photo-in`
and their `-out` pair stood the whole time as the path taken by a browser
without View Transitions, and every viewer takes it now. What went was the
branch beside it — `photo-zoom.tsx`, `lib/view-transition.ts`, the `zooms` and
`zoomId` props, the emptied tile, the `viewer-stage` boundary and the
`.photo-zoom` rules — and with it the last per-photo `view-transition-name` in
the app, which is what the duplicate-name error was about.

Two decisions taken with the zoom were kept, both standing on their own:

- The viewer's photo still sizes to its own ratio rather than filling the
  stage. `object-contain` letterboxed it either way; the ratio only makes the
  box the same shape as the picture in it.
- The dismiss drag flings again, since nothing waits to receive the photo.

Locale switch and admin tabs keep their view transitions: they name a boundary,
never a photo, and were never part of this.
