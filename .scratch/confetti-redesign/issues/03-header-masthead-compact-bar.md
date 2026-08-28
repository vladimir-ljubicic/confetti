# 03 — Sticky header, ceremonial masthead, compact bar

**What to build:** The 1a top structure: sticky top row (animated mark + CONFETTI wordmark,
language pill, avatar when named), scrolling ceremonial masthead (eyebrow, stacked names
46px with italic "и", date line with flanking rules), and the sticky compact bar
(names 19px + date·count, sort segmented control, blur backdrop).

**Blocked by:** 01, 02

**Status:** done

- [x] Sticky top row per 1a spec (`top: 0; z-index: 4`, `#faf6ee`, padding `14px 18px 12px`)
- [x] Avatar: 32px circle, `#f1eadb` fill, Cormorant 16px `#7a5f24` initial; only when guest
      has a name
- [x] Masthead scrolls away; compact bar sticks at the top row's rendered height (measure,
      don't hard-code 57px)
- [x] Compact bar name/date block fades opacity 0→1 over 0.22s once `scrollTop > 140`
- [x] Sort segmented control restyled (track `#f1eadb`, active `#fffdf8` + `#8a6d2c`),
      labels "Уживо" / "Хронолошки" — semantics map to existing sort modes (Уживо = newest)
- [x] Language pill restyled per §11 (active `#8a6d2c` ivory label, hairline pill), same
      component reused on admin

## Comments

Decided: hardcode couple names + date ("Јелена и Владимир", 20 · 09 · 2026).
