# 16 — Admin Гости tab + one-guest page (9b, 9d)

**What to build:** Guests tab (restyled uploader list + inline rename) and the per-guest
detail page, including the new per-guest upload block.

**Blocked by:** 15

**Status:** done

9b:
- [x] One `#fffdf8` row per guest: 40px avatar, name + "N фотографија · M приватне",
      "Преименуј" pill, "›" chevron; row navigates to 9d
- [x] Inline rename state: 1.5px `#b08d3c` row border, text input, gold "Сачувај";
      only changes the display name (existing rename API)

9d:
- [x] Header: 52px avatar, name 28px Cormorant, "N фотографија · M лајкова" (nowrap),
      "Преименуј" pill
- [x] "Све / Јавне / Приватне" chips + 3-column grid of that guest's photos
- [x] Pinned settings, two rows: per-guest upload "Дозволи / Забрани" control;
      "Сакриј све од овог госта · N →" (per-guest ZIP export dropped — see issue 18)
- [x] **New server-side:** `uploads_blocked` per uploader (migration) — Забрани removes the
      upload button for that guest only; existing photos stay visible and untouched;
      ticket issuance rejects blocked guests server-side

## Comments
