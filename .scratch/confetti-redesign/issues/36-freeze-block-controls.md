# 36 — Freeze block: replace native input chrome (11a)

**What to build:** ALIGN §1.4 — the date + days inputs keep the feature but get app
styling; never raw browser chrome.

**Status:** ready-for-agent

- [x] `src/app/admin/freeze-toggle.tsx:96-119` (`type="date"`, `type="number"`, shared
      style `:67`): today 9px radius, `bg-sand`, ~30px tall, OS calendar glyph in system font
- [x] Spec: ivory raised `#fffdf8`, 14px radius, Jost, 44px tall; hide/replace native
      picker chrome

Refs: ALIGN §0 (native date input note), §1.4.
