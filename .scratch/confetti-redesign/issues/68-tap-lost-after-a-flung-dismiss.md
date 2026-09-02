# 68 — The tap after a flung dismiss is lost to the viewer still standing there

**What to build:** After flinging a photo away to close the viewer, the next tap on a
tile opens that photo, on the first tap. Today that tap does nothing at all — no
photo, no visible change — and the photo opens on the second tap. The other ways out
(✕, Escape, a backdrop or letterbox tap, hardware back) already open on the first tap.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] The viewer takes no input from the moment a dismiss commits, whichever gesture
      committed it, rather than from the moment history answers
- [x] Every other way out still closes exactly as it does now
- [ ] Confirm on a device: fling the viewer away, tap another tile the instant the
      gallery shows through, and see it open

## Comments

[62](62-first-tap-after-close.md) fixed the window where the viewer is fading: taps
pass through it to the gallery, and each open is a viewer session of its own so the
close in flight no longer clears the one the tap opened. What it left is the window
before that one, between the release that commits the dismiss and the fade beginning.

The viewer learns it is closing from the popstate that answers stepping back out of
its history entry, and only then does it stop taking input. A same-document traversal
is answered a task or more later, on a main thread busy with the release's own 200ms
transition. Every other way out leaves the viewer painted over the whole screen for
that wait, so a tap in it lands on a viewer that is plainly still there. A fling does
not: the photo is thrown off screen and the chrome fades to nothing the moment the
finger lifts, leaving the stage at its 0.3 floor. The guest sees the gallery through
it and taps a tile — and the tap lands on the viewer, which is still full-screen and
still taking input, and has nothing under the finger to do anything with it. The
second tap works because the viewer is gone by then.

The wait is longer than the traversal alone. A tap whose press lands before the viewer
goes inert and whose release lands after it resolves to an ancestor of both, so the
tile's own click never fires — the whole press counts towards the window, not just its
start.

So the dismiss now marks the viewer as leaving where it commits, and a leaving viewer
is inert. It has refused every further gesture from that moment anyway — a second
dismiss is dropped, and the guest is on their way out — so nothing is lost by it, and
the fling no longer leaves an invisible viewer standing over the gallery.

Left for a human: this was reasoned from the source and the close path's timings, not
watched — there is no browser here, and the repo's tests are over pure functions, so a
viewer flung away and a tile tapped after it is beyond what they reach.
