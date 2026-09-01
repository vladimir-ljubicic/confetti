# 48 — Shared-element zoom into and out of the viewer (7a)

**What to build:** The one transition that makes the app feel native. Today a generic
fade+scale (`viewer-in`/`viewer-photo-in`, `globals.css:288-332`); View Transitions are
used only for locale switch and admin tabs.

**Status:** done

- [x] Tile → viewer via View Transitions API, `view-transition-name` per photo id;
      backdrop darkens to `#1b1815` over ~260ms
- [x] Return zoom targets the **last** photo seen, not the original tile — the scroll
      logic already lands there (`photo-grid.tsx:312`, `grid-window.ts:114`); the
      transition should too
- [x] Swipe-dismiss end state zooms back to the tile instead of flinging the photo
      off-screen (`use-swipe-dismiss.ts:146`)
- [x] Keep the fade fallback where VT is unsupported; honour reduced motion

## Comments

The pair is made and broken by mounting, which is what React pairs on: the tile holds
`photo-<id>` while the viewer is closed, and drops its image for as long as the stage
shows that photo. So the tile stands empty behind the viewer — visible only through the
thinning stage during a dismiss drag, where an empty slot is what the gesture means.

The viewer's photo now sizes to its own ratio rather than filling the stage, so both
ends of the zoom are boxes holding the same picture at different scales. Tiles already
carry the photo's ratio and crop nothing, so the morph is a pure scale.

The stage carries a name of its own so its 260ms is ours rather than whatever the
browser gives the page behind it; the gallery it covers goes on the root cross-fade.

Only a grid that hands its tile over zooms, and it is the grid that says so. An
addressed photo (`?photo=`, or history stepped back onto one) has no tile to leave
from — the gallery may not have reached it — so it keeps the fade both ways, as do the
admin and my-photos viewers, whose grids hand nothing over.

Refs: REVIEW §1; ALIGN §2 7a, §3 Motion.

Related: [62](62-first-tap-after-close.md) — the first tap after the viewer closes is swallowed; same close path.
