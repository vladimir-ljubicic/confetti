# 47 — Viewer dismiss thresholds and curves (7a)

**What to build:** Spec thresholds and curves for the dismiss gesture, keeping both
directions.

**Status:** done

- [x] Thresholds 110px / 0.5px·ms⁻¹ (today 90 / 0.45, `use-swipe-dismiss.ts:17-19`),
      applied to travel in either direction
- [x] Photo scale floor 0.88 (today 0.85, `:26`); backdrop thins to 0.3, never 0
      (today fades to 0 over 320px, `:27`, `:166`) so the gallery stays visible
- [x] Axis lock from ~10px of movement (today 6px, `:14`); horizontal keeps precedence

## Comments

REVIEW §1 rules down-only ("up usually means more detail; binding both makes accidental
closes likelier"). Ruled against: up-dismiss (commit c0cb028) stays, both directions
dismiss.

Refs: REVIEW §1; ALIGN §2 7a.
