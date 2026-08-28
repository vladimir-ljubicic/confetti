# 02 — `<ConfettiMark>` brand mark

**What to build:** CSS-only brand mark: five absolutely positioned flecks in a relative box,
`border-radius: 1px`, sized via a `size` prop (canonical geometry at 14px in the README table;
18/20/22px variants scale proportionally). Used in 20+ places.

**Blocked by:** 01

**Status:** done

- [x] Static variant: settled rotations (−24°, 32°, −12°, 48°, −40°)
- [x] Animated variant (header only): `fleck-fall` 0.9s staggered 0.05–0.62s on mount,
      then `fleck-drift` 4.4–5.6s infinite — timings/keyframes verbatim from README
- [x] Desaturated variant for 14a (flecks at 0.35–0.5 alpha)
- [x] `prefers-reduced-motion: reduce` → flecks render settled, no animation

## Comments
