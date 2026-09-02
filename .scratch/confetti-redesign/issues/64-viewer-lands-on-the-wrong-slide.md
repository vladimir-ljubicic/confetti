# 64 — The viewer lands on a neighbouring photo deep in the gallery

**What to build:** Opening a photo shows that photo, wherever in the gallery it stands.
Today, past the first few hundred tiles, the viewer opens on a photo one or two along
from the one tapped — reachable in practice by dragging the scrub rail down and opening
a tile where it comes to rest.

**Status:** done

- [x] The tapped photo is the one on the stage at every position in the gallery,
      including the last of nine thousand
- [x] The counter and the tile the grid hands over agree with what is on the stage —
      today they name the tapped photo while the stage shows another
- [x] Regression test over the arithmetic that places a slide, at a fractional track
      width and an index in the thousands

## Comments

Watched on a recording, then reproduced. The tell is that only the stage is wrong: the
grid empties the tapped photo's tile, the counter reads its number, and the photo shown
belongs to a different guest. So `index` is right and the track's scroll is not.

The track carries one spacer as wide as every slide before the mounted window
(`width: <n>00%`) and slides of `w-full` after it, and the viewer scrolls to a slide by
multiplying its index by `track.clientWidth` (`photo-viewer.tsx`, the layout effect and
`onScroll`). `clientWidth` is rounded to a whole pixel; the percentages the browser
resolves are not. On a screen whose CSS width is fractional — 392.72px on a 3× phone —
each slide sits 0.28px earlier than the arithmetic thinks, and by slide 3471 that has
grown to some 950px: two and a half slides. Scroll snapping then settles on whichever
slide is nearest, and `onScroll` divides by the same rounded width and reports the index
it started from, so nothing downstream notices.

Reproduced by forcing the dialog to a fractional width in a browser whose viewport is
otherwise a whole number of pixels: tapped and shown disagree at index 1913, 4814 and
8976, and agree at every index when the width is whole. That is also why it takes the
scrub rail to meet: nothing else carries you thousands of tiles down.

Two symptoms fell out of the same cause and went with it:

- No zoom on the way in. The shared name sits on the slide at `currentIndex`, which is
  now off screen, so the photo travels where nobody can see it and the viewer appears in
  one cut.
- A photo flashing on the way out. The return zoom likewise pairs the slide at
  `currentIndex` rather than the one the guest was looking at, so a photo they never
  opened is what animates back to the grid.

Fixed by asking the track for the width its own layout used —
`getComputedStyle(track).width`, which keeps the fraction — rather than
`clientWidth`, which does not, and by putting the two directions of the
arithmetic in one place (`slide-track.ts`) so they cannot drift apart again.

Verified against the seeded gallery of 9170 photos in a browser forced to a
fractional track width: tapped and shown now agree at index 1913, 4814 and 9169,
where before they disagreed by two slides. Both symptoms went with it — the
photo travels from the tile again on the way in, and the way out carries the
photo the guest was actually looking at.
