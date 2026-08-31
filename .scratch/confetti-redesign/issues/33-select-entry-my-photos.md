# 33 — "Изабери" pill + long-press hint on 8a

**What to build:** Discoverable entry into select mode. ALIGN §1.3; REVIEW §9.

**Status:** ready-for-agent

- [x] "Изабери" pill on its own line under the Све/Јавне/Приватне filter row, with
      *Или дуго притисните било коју фотографију* beside it
      (`src/app/my-photos/profile-view.tsx` goes filter row `:427` → grid `:445` today)
- [x] Strings both locales — `myPhotos` has no enterSelect/hint (`dictionaries.ts:353`)
- [x] Pill enters the same select mode long-press does; long-press stays
- [x] Build as a reusable block — 11a and 11d need it verbatim (issue 34)

Refs: ALIGN §1.3, §2 8a.
