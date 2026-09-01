# 62 — The first tap after closing the viewer is swallowed

**What to build:** After closing a photo, the next tap on a tile does nothing — the
gallery behaves as if that tap only handed focus back, and the photo opens on the
second tap. Every tap after that opens on the first. Opening a photo should always
take one tap, whether or not a photo was just closed.

**Status:** ready-for-human

- [ ] Reproduce and pin the cause down before changing anything: on device, and with
      each way out of the viewer (✕, Escape, backdrop tap, swipe-dismiss, hardware
      back), since they may not all lose the tap
- [x] Fix it at the cause; a tap-through shim over the grid is not a fix
- [x] Regression test covering close → tap another tile → the viewer opens on that
      photo

Leads, none confirmed:

- The viewer holds itself on screen for `CLOSE_MS` after the close commits
  (`photo-viewer.tsx:37,286`), full-screen and `fixed inset-0 z-50`; it is
  `pointer-events-none` while it fades, so a tap landing in that window should pass
  through — worth confirming it actually does
- Closing steps back out of the viewer's history entry (`use-history-entry.ts`), and
  the router handles that popstate; a re-render replacing a tile's `<button>` between
  pointerdown and pointerup fires no click
- The viewer restores `document.body.style.overflow` on unmount
  (`photo-viewer.tsx:250-256`), and `revealPhoto` scrolls the grid to the photo last
  seen (`photo-grid.tsx:312`) — a scroll settling under the finger can eat a tap
- Pointer capture taken during a swipe (`use-swipe-dismiss.ts:79`) on an element that
  then unmounts

Ordering with [48](48-shared-element-zoom.md): independent, but both rewrite how the
viewer leaves. Land this first — a return zoom built on a close path that loses the
next tap inherits the bug and makes it harder to see.

## Comments

The first lead was right about the window and wrong about what happens in it. The tap
does pass through: the leaving viewer is `pointer-events-none` for its whole fade, and
the tile beneath it takes the tap and opens the photo. What loses it is the close that
is already in flight. Each gallery held one record for the viewer as a fixture rather
than one per turn at the screen, so the tap only rewrote that record; the same viewer
stayed mounted, still frozen mid-exit on the photo it was leaving with, and the
`CLOSE_MS` timer the first close armed then cleared the record the tap had just
written. Hence a tap that changes nothing on screen, and a second one that works
because by then there is nothing left in flight.

So each open is now a viewer session, numbered, and the viewer is keyed by that
number: a tile tapped through a leaving viewer replaces it outright instead of being
folded into its exit. A close names its own session, which is what holds when the
timer fires in the gap between the tap and React committing its transition — the
tap's session is already the one in the record, and the outgoing close passes over it.
Reusing the instance instead was not open to us: the viewer has already stepped out of
its history entry by then, and a reopened one would hold no entry to leave by.

The way out doesn't matter: ✕, Escape, a backdrop or letterbox tap, a swipe and the
hardware back all reach the same `leave()` and the same fade. What does matter is
whether the viewer fades or zooms. Only the fade holds the screen after committing to
close; a zoom hands the photo back to its tile in the commit itself and has no window
to lose a tap in. So this was reachable wherever the viewer fades both ways: a
`?photo=` address or history stepped back onto a photo, any browser without View
Transitions, and — always, since both pass `zooms={false}` — the guest's own photos
and the admin grid. All three galleries that stand a viewer up now number its
sessions.

Two things this leaves for a human. It was not reproduced on a device: there is no
browser here, so the cause is pinned from the source and from the fade path's timings
rather than watched. And the regression test covers the state machine the bug lived
in, not the remount that carries half the fix — a grid rendered and tapped is beyond
what this repo's test setup reaches today, so deleting the `key` would leave the suite
green.
