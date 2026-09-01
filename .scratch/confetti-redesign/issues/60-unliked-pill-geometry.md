# 60 — Decision: unliked like-pill geometry

**Status:** resolved

README says the unliked pill should read as a 34px circle, but the spec's own numbers
(min-width 34, `0 10px` padding, 16px glyph) produce 36px — and the build faithfully
renders 36 (`like-pill.tsx:70-80`, `px-2.5` + `h-4 w-4`).

Options: `px-2` when count is 0; or fixed `w-[34px]` when unliked; or keep 36 and note it
in the spec. Two-minute fix once ruled.

## Answer

The circle wins: the pill is 34px whenever it carries the heart alone.

The spec's prose states the intent outright ("without it the padding is added to
`min-width` and the unliked pill is never a circle"), so the circle is what was specified
and the 36px is the arithmetic slipping, not a second design. `box-sizing: border-box`
was the wrong lever — it stops padding widening a fixed `width`, but a flex item still
grows past `min-width` for its content, so 16px glyph + 2×10px padding is 36px either way.

Fix: a fixed `w-[34px]` while the count is hidden — the shape then states itself instead of
falling out of a min-width and a padding tuned to stay under it. `min-w-[34px] px-2.5`
once a count sits beside the heart. Height, radius, fill, blur and the 44px tap wrapper are
untouched, as is the liked pill's 10px padding.

The handoff README keeps its `padding:0 10px` line — the handoff docs are left as
received (drift-audit question 4 still covers updating them), and the rule the code now
follows is stated in `like-pill.tsx`.
