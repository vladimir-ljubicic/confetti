# 70 — Stepping back off a guest's gallery lands at the top of the one it was reached from

**What to build:** A guest who scrolls down the gallery, opens a photo, takes its
uploader pill to that guest's gallery and steps back off it lands where they were
standing, not at the top. Today they land at the top, and the gallery's entry stays
that way: every later step back onto it — off a guest's gallery, off My photos —
lands at the top too.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Taking the uploader pill and stepping back off the guest's gallery, by its own
      back arrow or by the hardware back, lands on the photo the viewer was showing
- [x] Coming back to the gallery a second time — off a guest's gallery reached from a
      tile's uploader label, off another page — lands where it was left, as it does
      before a viewer is ever opened
- [x] Closing the viewer still lands on the photo it was showing, however far the
      guest swiped from the tile they opened
- [ ] Confirm on a device: scroll down, open a photo, take the pill, step back, and
      see the gallery where it was left

## Comments

Two faults, one on top of the other.

Scroll restoration is a property of a single history entry, not of the page: setting
it names the entry standing at the time, and an entry pushed from one that has it off
inherits it. The viewer turns it off so that stepping back out of its own entry lands
on the photo it is showing rather than on the tile it was opened from, and turns it
back on when it goes. Every way out but one steps back onto the gallery's entry first,
so the two happen on the same entry and it is left as it was found. The uploader pill
is the one that does not: it hands the viewer's entry to the guest's gallery and never
returns, so the gallery's entry is left with restoration off for the rest of the
session. Nothing landing on it is ever put back — not the step off the guest's gallery,
and not any step onto it afterwards. This came in with the viewer taking the back
gesture ([664830d]), long before the pill learned to hand its entry over, and was
watched at every commit between the two.

So the entry underfoot is put back to auto whenever a step through history lands on it
with no surface holding restoration off. That repairs the gallery's entry the first
time it is returned to, and every entry any other hand-over strands.

Repair alone cannot restore the step it repairs, though, and the browser could not be
left to that step anyway: it restores against the page as it stands mid-traversal,
still only as tall as the guest's gallery being left, and clamps the gallery's place to
the bottom of it. So the gallery keeps its own place across the narrowing — where it
was standing when it narrowed to a guest, put back when that guest's gallery is left —
and drops it wherever the sort scroll memory beside it is dropped, since the same
rearrangements leave it naming nothing. Both ways into a guest's gallery keep it, the
pill and a tile's uploader label alike.

Watched in a headless Chromium against the dev server at phone size, not on a device:
scrolled down, opened a photo, took the pill, stepped back by both the back arrow and
the hardware back, and landed where the gallery was left, twice over on one load. The
viewer's own close still lands on the photo it was showing six swipes from the tile it
was opened on, and a page navigated away from and back is where it was left.
