# 69 — Stepping back out of a guest's gallery flashes the photo it was reached from

**What to build:** A guest who opens a photo in the gallery, takes its uploader pill to
that guest's gallery, opens a photo there and steps back twice lands on the gallery they
started in, with no viewer over it. Today the second step back flashes the first photo
full screen before the gallery arrives.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] The uploader pill's move leaves no entry and no address naming the photo the
      viewer was showing, so nothing on the way back can open it again
- [x] One step back off a guest's gallery reached through the pill leaves both the
      gallery and the viewer it was reached from, landing on the gallery the viewer was
      opened from
- [x] A guest's gallery reached through the pill from a shared `?photo=` link, where the
      viewer holds an entry with nothing of this site behind it, still leaves by its own
      back arrow rather than stepping off the site
- [x] Every other way into a guest's gallery — the uploader label on a tile, the address
      itself — pushes an entry of its own as it does now
- [ ] Confirm on a device: open a photo, take the pill, open a photo there, step back
      twice, and see the gallery arrive without a photo flashing over it

## Comments

The pill already meant to spend the viewer's entry: it stepped back out of `?photo=X`
and pushed `/uploader/<guest>` in its place, so two entries deep on the guest's gallery
was one step from the guest's gallery and two from the gallery the viewer was opened
from. What was watched instead is the first photo appearing full screen for a frame on
that second step, which is the entry or the address still naming it somewhere on the way
back.

Which of the two it was could not be pinned down from the source, and there is no
browser here to put a breakpoint in: only two things open the viewer on a photo nobody
tapped, the `?photo=` the address carries at mount and the marker an entry holds, and
both are read on the way back through. So the move was made one that leaves neither.

The pill now hands the viewer's entry over instead of stepping back out of it: the
marker and the `?photo=` are cleared in place and the guest's gallery replaces the
address on that same entry. Nothing traverses, so there is no moment at which the
address names the photo and nobody to notice if it did, and no entry left in the stack
carries the photo — starving both readings at once. What the guest sees is unchanged:
the pill is a move from one gallery to another, and stepping back off the guest's
gallery leaves both it and the viewer, as it was meant to.

Handing an entry over says nothing about what is behind it, so the hand-over tells its
successor whether the entry it takes had one of this page's own beneath it. A viewer
opened from a shared `?photo=` link holds an entry it never pushed and there may be
nothing of this site behind it; the guest's gallery that takes that entry over knows not
to step back off it, and pushes an entry to leave by instead, as it already did for a
guest's gallery opened directly.

Left for a human: watched on a recording and reasoned from the source, not reproduced
here — the repo's tests are over pure functions, and a stack of history entries stepped
back through is beyond what they reach. Worth watching in the same pass: where the
gallery is standing when it arrives. The viewer holds scroll restoration off the entry
it was opened from for as long as it is up, so that entry may come back at the top
rather than at the photo's own tile.
