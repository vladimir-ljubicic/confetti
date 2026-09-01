# 44 — Per-sort scroll memory

**What to build:** REVIEW §1 / ALIGN §3 — remember a scroll position per sort within the
session and restore it when the guest returns to that sort.

**Status:** resolved

- [x] `changeSort` stores the outgoing sort's `scrollY` and restores the incoming sort's
      remembered position (top if none) — today it only scrolls to 0
      (`src/app/gallery-view.tsx:142-149`)
- [x] Session-scoped (in-memory or sessionStorage); instant, not smooth
- [x] First switch to a sort still lands at top with the full masthead

Refs: REVIEW §1; ALIGN §3 Sort.
