# 12 — Photo viewer (7a)

**What to build:** New dark full-screen viewer, background `#1b1815`. Opens on tile tap;
swipe left/right through the feed in its current sort order. No overflow menu, no page dots —
the "14 / 184" counter carries position.

**Blocked by:** 04, 05

**Status:** done

- [ ] Three zones per 7a spec: top row (40px ✕, centred counter), photo (`flex:1;
      min-height:0`, 100% width), caption + actions
- [ ] Caption: uploader name 25px Cormorant italic `#f0e7d2`, date·time line with flanking
      rules
- [ ] Action row: ivory "Преузми" (flex 1), bordered like pill (`♥` `#d9b866` + count),
      50px "↗" share circle → native share sheet
- [ ] "Учини приватном" / "Обриши" (`#e39a9a`) row, 44px each — only on the guest's own
      photos; on **every** photo in admin view (no separate admin viewer)
- [ ] Обриши → recycle bin (existing); private toggle reversible (existing visibility)

## Comments
