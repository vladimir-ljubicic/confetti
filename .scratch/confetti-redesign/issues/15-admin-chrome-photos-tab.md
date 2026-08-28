# 15 — Admin chrome + Фотографије tab (9, 9a)

**What to build:** Restyle the admin route: background `#f4efe4`, shared chrome ("← Галерија",
static mark + "АДМИНИСТРАЦИЈА", language pill), three-tab bar (track `#e7dfcd`, active
`#fffdf8` + `#8a6d2c`): "Фотографије" / "Гости" / "Корпа N". Then the photos tab.

**Blocked by:** 01, 02, 03 (language pill)

**Status:** done

- [x] Tab bar + chrome per §9; language pill present on admin
- [x] 9a: title "N фотографије" + sub; horizontally scrollable filter chips ("Сви",
      "Приватне N", one per guest — dozens possible; hidden scrollbar, momentum scroll)
- [x] 3-column grid with "Приватна" chips + tap hint line
- [x] Pinned settings block: "Отпремање гостију" with "Отворено / Замрзнуто" segmented
      control (existing freeze flag); "Преузми све · ZIP →" opens issue 18's sheet
- [x] Admin tile tap opens the shared viewer (issue 12) with admin actions

## Comments

Decided: keep the existing admin login/session; restyle only. Ignore the README's
`?k=` + localStorage unlock.
