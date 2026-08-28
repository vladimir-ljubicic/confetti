# 11 — Offline queue (14b) + rejected photo (14c)

**What to build:** Upload resilience states.

**Blocked by:** 09, 10

**Status:** done

14b — offline with uploads queued:
- [x] Notice card under compact bar (`#f7e9e3`, "!" `#8a4b2c`, "Нема интернета", queue count,
      40px "Пробај сада")
- [x] Queued tiles under `rgba(43,38,32,0.42)` scrim labelled "чека"
- [x] Queue auto-resumes on reconnect; never a raw error string

14c — one photo rejected (e.g. over size limit):
- [x] Card at the bottom (6c geometry): 44px thumbnail, "1 фотографија није прошла",
      reason + success count, gold "Пробај поново" + "Изостави"
- [x] Rest of the batch lands normally; never blocks successful photos

## Comments
