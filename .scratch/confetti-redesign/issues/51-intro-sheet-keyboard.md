# 51 — Intro sheet keyboard affordances (3a)

**What to build:** REVIEW §8's remaining rules; the two-state/visualViewport work is done.

**Status:** done

- [x] Enter on Име → focus Презиме; Enter on Презиме → submit. Today implicit form
      submission fires **submit** from Име — the opposite, with an empty surname
      (`intro-sheet.tsx:184-192`, `:201-208`, no onKeyDown)
- [x] `inputMode="text"`, `autoCapitalize="words"` on both fields (absent repo-wide)
- [x] Pin the heading block in the rest state — it sits inside the scroller today
      (`intro-sheet.tsx:158-179`); compact state already pins correctly

Refs: ALIGN §2 3a; REVIEW §8.
