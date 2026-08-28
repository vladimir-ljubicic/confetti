# 20 — English copy + layout regression (11)

**What to build:** All new/changed copy in `dictionaries.ts` for both locales, then verify
the two pressure points where Latin runs ~20% longer hold on one line at 390px:

**Blocked by:** 03, 08 (everything else lands copy as it goes)

**Status:** done

- [x] Compact bar (11a): "Jelena & Vladimir" + "20.09.2026 · 184" left, "Latest / Oldest"
      right, one line
- [x] Intro sheet (11b): "First name" / "Surname · optional" side by side; "All guests /
      Couple only" cards; "Save and upload 4 photos" one line at 16px
- [x] Sweep every screen (incl. admin) for missing dictionary keys — no hard-coded strings

## Comments

Verified 2026-08-28: two accepted exceptions to "no hard-coded strings" — error.tsx
carries both-locale copy inline (dictionaries.ts is server-only, unreachable from the
client error boundary; documented in-file), and the event date is a literal per issue
03's "hardcode couple names + date" decision.
