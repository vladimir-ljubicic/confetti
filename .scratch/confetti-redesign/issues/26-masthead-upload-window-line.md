# 26 — Upload-window line in the masthead

**What to build:** In the live gallery's ceremonial masthead (1a), under the date line:

> "Додавање фотографија је отворено још N дана — после тога преузмите целу галерију."

**Blocked by:** 25

**Status:** ready-for-agent

- [ ] 12px, line-height 1.6, `rgba(43,38,32,0.62)`, centred, `max-width: 250px`
- [ ] Scrolls away with the masthead (lives in the masthead, not the compact bar)
- [ ] N = whole days until the derived freeze moment (event_date + offset), from
      event_settings; Serbian pluralization for дан/дана
- [ ] Hidden once the gallery is frozen (1b thank-you card takes over) — and hidden if
      N ≤ 0 while cron hasn't flipped yet
- [ ] EN string for the English layout; both locales in `dictionaries.ts`

## Comments
