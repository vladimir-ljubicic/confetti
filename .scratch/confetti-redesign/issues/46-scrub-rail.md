# 46 — Right-edge scrub rail (6c)

**What to build:** Custom scrubber for 1000+ galleries, labelled by the active sort key.
Nothing exists (`grep scrub` → zero hits).

**Status:** resolved

- [x] Mount only above ~300 photos; invisible at rest, fades in while scrolling, out
      ~1.2s after it stops
- [x] 12×56px thumb, 44px touch target; bubble only while dragging
- [x] Bubble states the value the list is ordered by: Најновије → time of day
      (`22:15 · Субота вече`); Популарно → like band from the album's own ~90/60/30
      percentiles (`24+ ♥ Најдраже` → `10+ ♥ Вољене` → `5+ ♥` → `Без лајкова`) — never
      hard-coded thresholds, never a date
- [x] While dragging: flat `#f1eadb` placeholders, fetch images only when the finger
      lifts (virtualized grid already windows; suppress image loads during drag)

Refs: ALIGN §2 6c; REVIEW §9.
