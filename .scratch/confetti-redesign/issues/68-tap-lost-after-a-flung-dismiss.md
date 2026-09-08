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
- [x] A tap that lands as the fade ends opens a session of its own, numbered past
      the one closing, rather than being folded into it
- [x] Reproduced in Chromium with touch emulation, fixed at the cause, and watched
      open on the first tap at every delay across the fade
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

Not resolved by the above: the tap was still lost on a device. Reproduced here in
Chromium with touch emulation (Playwright, Pixel 7), which the earlier reasoning had
no way to do, and the cause is not the viewer standing there at all. The step back
out of history is answered within about 3ms of the release, so the inert window above
was never wide enough to matter. The tap reaches the tile every time, and the tile
opens a session. What loses it is the close and the open settling in one render, in
that order.

The fade ends on a 200ms timer that closes the session. Blink holds timers back while
a finger is down, so a tap whose press begins before the timer is due and lifts after
it is answered in one go: the timer runs, then the tap's click. Both set the gallery's
viewer record, and React folds the two into a single render: the close leaves nothing
open, and the open then numbers the new session from nothing and gets 1, the number of
the session that has just closed. Same key, so React keeps the old viewer instance and
only hands it a new starting photo, which it ignores after mount. That viewer is at
the end of its exit, faded to nothing, inert and unable to leave again, and it stays
that way until the next tap, which is numbered 2 and replaces it. Hence no visible
change, and a photo on the second tap.

A fling exposes it because the gallery shows through at once and the guest taps while
the fade is still running; every other way out keeps the viewer painted until the fade
ends, so the guest's press begins after the timer has run. The window is the whole of
the press, not the 3ms above.

So the gallery's record now keeps a count of the sessions it has opened, and the count
outlives a close: no session is ever numbered like an earlier one, and a close and an
open in the same render give the open a viewer of its own. The regression test pins
that pair. Watched in Chromium: with the fix, a tap at every delay from 20ms to 600ms
after the release, with presses of 60ms and 120ms, opens the tapped photo on the first
tap; without it, every press that spans the end of the fade is lost. The device check
stays with a human: the browser here is Chromium, not the phone's.
