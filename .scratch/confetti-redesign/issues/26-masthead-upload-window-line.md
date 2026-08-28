# 26 — Upload-window line in the masthead

**What to build:** In the live gallery's ceremonial masthead (1a), under the date line:

> "Додавање фотографија је отворено још N дана — после тога преузмите целу галерију."

**Blocked by:** 25

**Status:** done

- [x] 12px, line-height 1.6, `rgba(43,38,32,0.62)`, centred, `max-width: 250px`
- [x] Scrolls away with the masthead (lives in the masthead, not the compact bar)
- [x] N = whole days until the derived freeze moment (event_date + offset), from
      event_settings; Serbian pluralization for дан/дана
- [x] Hidden once the gallery is frozen (1b thank-you card takes over) — and hidden if
      N ≤ 0 while cron hasn't flipped yet
- [x] EN string for the English layout; both locales in `dictionaries.ts`

## Comments

Decided (grilling 2026-08-28): N = Belgrade calendar days counting today (freeze
tonight at midnight → N=1); hidden when frozen or N ≤ 0. N=1 uses dedicated wording:
СР "Додавање фотографија је отворено још само данас — после тога преузмите целу
галерију.", EN "Photo uploads are open through today — after that, download the full
gallery." The download mention is plain text, not a link.
