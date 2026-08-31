# Review: open items before implementation

State of the design as of this review: screens 1a–13c are complete and visually
consistent — one ivory/gold/ink palette, one glass like pill, one pill/toggle vocabulary,
masonry grid and the shrinking ceremonial masthead on every gallery surface. No visual
changes recommended.

Everything below is **behaviour, not pixels**. Items 1, 2, 5, 7 are decided and only need
writing into the spec. Items 3, 4, 6 need the couple's decision first.

---

## 1. Motion, gestures and history are unspecified — highest risk

Decided in conversation, never written down. Without it the implementation will invent its
own answers, and most of them will be wrong.

**Transitions worth building**

- **Photo → viewer (7a): shared-element zoom.** The tapped thumbnail expands to the full
  photo (View Transitions API, `view-transition-name` per photo id); backdrop darkens to
  `#1b1815` over 260ms. This is the one transition that makes the app feel native, and it
  answers "where did I come from".
- **New tiles entering the grid.** Optimistic tiles must not jump: 200ms `opacity 0→1` +
  `scale(0.96)→1`. Same for infinite-scroll pages, staggered 40ms.
- **Like.** Heart `scale(1)→1.25→1` over 220ms, `cubic-bezier(.2,.8,.3,1.4)`; the count
  swaps with no animation. No particles — the confetti mark already carries that.
- **Bottom sheets (3a, 5d, 10a).** Slide up 280ms `cubic-bezier(.2,.9,.3,1)` + scrim
  `opacity 0→1` 200ms. Closing is faster (200ms) and also works by dragging down.
- **Admin tabs (11a–11c).** Opacity cross-fade 160ms + the pill sliding 200ms. No horizontal
  slide — three tabs are not a carousel.

**Deliberately not doing**

- Full page-slide transitions between routes (gallery ↔ profile ↔ guest gallery) — they lag
  on phones and fight the back gesture. A 120ms fade is enough.
- Parallax or fade-on-scroll on the photos themselves — the masthead fade already covers it.
- Shimmer skeletons — a pulsing grey grid kills the ceremonial tone. Use flat `#f1eadb`
  rectangles that cross-fade out when the image arrives.

**Sort change scrolls to top, instantly.** Scroll position has no meaning in the new
ordering: "260px down" in Најновије is not the same content as in Популарно, and the point
of tapping Популарно is to see the most-liked, which is at the top.
`window.scrollTo({ top: 0, behavior: 'instant' })` synchronously with the sort change — not
smooth. The masthead returns to its full ceremonial state, which visually confirms "new
list". Keep a remembered scroll position **per sort** and restore it if they return to that
same sort in the session.

**Leaving the viewer returns to the LAST photo seen, not the first.** If a guest opens photo
n and swipes to n+20, closing must land on n+20. The viewer is the gallery in another form;
returning to n silently erases 20 steps of progress. Practically: the viewer tracks the
current index; on close the gallery scrolls so that tile is visible (`block: 'center'`,
instant, via `getBoundingClientRect` + `window.scrollTo` — never `scrollIntoView`). If n+20
sits in a not-yet-loaded infinite-scroll page, load pages up to it **before** revealing the
gallery. The shared-element zoom back targets that tile, not the original.

**Swipe down to dismiss the viewer — down only, never up.** Down matches the bottom-sheet
dismiss gesture used elsewhere; up usually means "more detail" and binding both loses that
affordance and makes accidental closes likelier.

- The gesture only starts when the photo is unzoomed (`scale === 1`); when zoomed, vertical
  drag pans the photo.
- The photo follows the finger 1:1 with `scale` 1 → 0.88 and the backdrop thinning
  (`opacity` 1 → 0.3) proportionally, so the gallery is visible underneath.
- Thresholds: `translateY > 110px` **or** velocity > 0.5px/ms → dismiss (shared-element zoom
  to the tile). Otherwise spring back over 220ms.
- Horizontal swipe takes precedence: lock the axis from the first ~10px of movement and keep
  it for the rest of the gesture.
- Tapping the backdrop and the ✕ still close. The gesture is an addition, not a replacement.

**The back gesture must close the viewer, not leave the gallery.** Today the viewer is
rendered over the main route, so a guest who came from my-photos, browsed the main gallery
and opened a photo gets thrown back to my-photos. Fix with history:

- Opening: `history.pushState({ viewer: photoId }, '', '?photo=<id>')` — the viewer renders
  from that state, not from local `useState`.
- `popstate` → close the viewer (shared-element zoom back to the tile).
- Closing via ✕ or swipe-down calls `history.back()` rather than closing directly, so there
  is exactly one exit path and history does not grow.
- Free bonus: `?photo=<id>` is a shareable link and a refresh restores the same photo.
- Push **one** entry for the whole viewer session — swiping through 20 photos updates
  `?photo=` via `replaceState`, otherwise it takes 21 back presses to escape.
- The same applies to full-screen sheets (3a, 5d, 10a): back should close the sheet, not the
  page.

**Infinite scroll, not pagination** (already noted under 1a in the README, repeated here as
it belongs to the same behaviour set): pages of ~30 via `IntersectionObserver`, a small
inline loading indicator, and never inserting other guests' new photos at the top mid-scroll
— use a glass "Нове фотографије ↑" pill instead.

## 2. "Популарно" will look broken in the first hours

When every photo has 0–1 likes, sorting by popularity returns almost the same order as
Најновије and the guest concludes the button does nothing.

- Tie-break popularity by newest-first, always.
- Only show the sort toggle once the album has **≥10 likes in total**; until then show
  Најновије alone with no toggle (the way 2a already drops it).

## 3. Duplicate uploads — needs a decision

Guests re-pick the same photos from their camera roll, especially after a cancelled or
failed batch. There is no check, so the feed fills with doubles.

Cheap fix: hash files client-side at selection time and skip ones already uploaded by this
guest, with a quiet line in the intro/upload flow: "2 фотографије су већ отпремљене,
прескачемо их." Low effort, prevents the most visible content problem.

## 4. Identity is browser-local — needs a decision

A guest who clears browser data or switches phones loses access to their own uploads: they
can no longer hide or delete them, and their name detaches from future uploads. This is a
hole rather than an enhancement — a 6-character recovery code shown in 8a ("Сачувај овај код
ако мењаш телефон") is enough to close it.

## 5. Where does an optimistic tile go if the guest is in "Популарно"?

Undefined today. Switch the sort to Најновије automatically when an upload starts — the
guest is looking for their own photo, not for someone else's popularity.

## 6. Contrast of muted text — needs a decision

`rgba(43,38,32,0.45)` at 11px (group labels, "20.09.2026 · 184", counters) falls below WCAG
AA on ivory. Raise muted text to `0.55` minimum and do not go below 12px. Affects many
screens, so it is a global token decision rather than a local fix.

## 8. The intro sheet and the Android keyboard — implementation, not redesign

Reported from a real Android device: the sheet autofocuses Име, the keyboard opens
immediately, and the sheet is too tall to fit above it — the visibility cards
(Сви гости / Само младенци) end up scrolled out of view, so the guest never sees the choice
at all. The design already covers this; 3a ships **two states** and the app is using the
wrong one. No redesign needed. Three rules:

1. **Do not autofocus.** The sheet opens at rest, at its full ceremonial height (left phone
   in 3a): mark, heading, two lines of explanation, both fields, visibility cards, primary
   button. The guest reads what is being asked, then taps a field deliberately.

2. **Switch to the compact layout as soon as the keyboard is up** (right phone in 3a). The
   compact state drops the confetti mark and the two explanatory lines, puts the heading on
   one 22px line with "Питамо само први пут" beside it, and collapses the visibility choice
   from two description cards to a single row of two pills. Budget: an Android keyboard plus
   browser chrome leaves roughly 320–340px of usable viewport on a 6" phone, and the compact
   sheet fits in ~300px. Both fields, the visibility row and the primary button are all
   visible with the keyboard open — nothing important is ever behind it.

3. **Size against `visualViewport`, never `100vh`/`100dvh`.** Listen to
   `visualViewport.resize` and set the sheet's height and bottom offset from
   `visualViewport.height` + `offsetTop`. The content area between the pinned header and the
   pinned action bar scrolls (`overflow-y:auto; overscroll-behavior:contain`), so even a
   comically tall keyboard degrades to "the middle scrolls", not "the button is unreachable".

Keyboard affordances while there: Enter on Име moves to Презиме, Enter on Презиме submits,
`inputmode="text"`, `autocapitalize="words"`, `autocomplete="given-name"` / `family-name`.

## 9. Discoverability of select mode (8a) and navigating a very large gallery (6c)

**Select mode had no visible entry point.** Long-press was the only way in, and a gesture
nobody is told about is a gesture nobody uses — the owner of the app missed it himself. 8a is now the **default** state of My photos and
carries an "Изабери" pill on its own line under the all / public / private filter row, with
"Или дуго притисните било коју фотографију" beside it; select mode itself is 8b. Both lead to the same mode; the pill is the discoverable path, long-press stays as the
fast one.

**A large gallery (1000+) needs a way back and a way through.** Two problems appear at that
size: there is no way back to the top except switching sort, and the native scrollbar becomes
a two-pixel sliver that cannot be grabbed. Designed in 6c:

- **Back-to-top is a thumb-reach button, not a target at the top of the screen.** A 48px
  round ↑ in the bottom-left corner, appearing after ~2 screens of scrolling and fading out
  when the guest reaches the top. It sits opposite the centred Додај фотографије pill so the
  two never collide. Reaching to the top of a 6.7" phone to get back to the top is exactly
  the motion the button exists to avoid.
- **A custom scrub rail on the right edge, labelled by the active sort key — never by date.**
  A date scrubber is meaningless for a wedding: every photo is from the same day, so the rail
  would read "20.09" end to end. In **Најновије** the bubble shows the time the photo was
  taken ("22:15 · Субота вече"), which is how guests remember the evening. In **Популарно**
  time carries no information about position, so the bubble shows a **like threshold** — the
  band the photo under the thumb falls into: `24+ ♥ Најдраже` → `10+ ♥ Вољене` → `5+ ♥` →
  `Без лајкова`. Bands read as groups and make the useful jump possible ("take me to the ones
  with no likes yet"). Derive the four bands from the album's own distribution (roughly the
  90th / 60th / 30th percentile of like counts) rather than hard-coding 24/10/5. The rule:
  the bubble always states the value the list is ordered by.
- The rail is invisible at rest, fades in while scrolling and out ~1.2s after it stops. The
  thumb is 12×56px with a 44px touch target, and the bubble only appears while dragging.
- Only mount the rail when the gallery holds more than ~300 photos; below that it is noise.
- Dragging the thumb scrolls without loading full images — show the flat `#f1eadb`
  placeholders while dragging and only fetch what remains on screen when the finger lifts,
  otherwise a fast drag fires hundreds of image requests.

## 7. Screen numbering — resolved

The board has been reordered into journey order and renumbered gap-free, so the old ids in
the v1–v3 handoff documents no longer match. Current numbering:

| Turn | Screen(s) | Was |
|---|---|---|
| 1 | confetti mark | 3a |
| 2 | empty state | 2a |
| 3 | introduce yourself (rest + keyboard) | 4a |
| 4 | the avatar arrives | 12a |
| 5 | uploading: 5a small batch · 5b bulk · 5c summary · 5d failure details | 6a–6d |
| 6 | main gallery: 6a masthead states · 6b thank-you footer · 6c large gallery | 1a–1c |
| 7 | photo viewer | 7a |
| 8 | my photos: 8a default · 8b select mode | 8a–8b |
| 9 | one guest's gallery (as any guest sees it) | 15a / "7b" |
| 10 | download everything: 10a start · 10b packing · 10c ready | 13a–13c |
| 11 | admin tabs: 11a photos · 11b guests · 11c bin · 11d one guest | 9a–9d |
| 12 | English strings: 12a gallery · 12b introduce yourself | 11a–11b |
| 13 | when things break: 13a dead link · 13b offline | 14a–14b |
