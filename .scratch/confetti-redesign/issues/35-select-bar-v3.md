# 35 — Select-mode bar to v3 layout (8b)

**What to build:** Current bar matches the old README, not v3.

**Status:** ready-for-agent

- [x] Top row: only **Изађи из избора** + a quiet `2 / 12` counter
      (today: exit + plain "Изабери све" text button, `profile-view.tsx:369-388`)
- [x] Action bar gains **Изабери све 12** as a checkbox chip → filled ✓ **Опозови избор**
      when all selected; respects the active filter (select-all already filter-scoped,
      `profile-view.tsx:352`)
- [x] Label `Одзначи све` → `Опозови избор` (`dictionaries.ts:355`)

Refs: ALIGN §2 8b.

## Comments

- Landed as part of 33 (`52d6f5f`) before this ticket was picked up; `a14e3d7` then lifted
  the bar into `src/app/select-mode.tsx` (`SelectTopRow`, `SelectBar`) so 8b and the admin
  grids share it. The counter is `selected / whole album`, unfiltered; the chip's count and
  its all-selected state are scoped to the filtered set.
