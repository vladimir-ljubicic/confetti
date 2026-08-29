# Handoff diff: v2 → v3

For a codebase that already implements the v2 handoff. Only these changes; everything else is untouched. Full context lives in `README.md`; screen ids reference `Gallery Directions.dc.html`.

## 1. Sort toggle: Уживо/Хронолошки → Најновије/Популарно

- Labels everywhere the control appears (1a, 1b, 6a–6c, 7b, 11a):
  СР "Најновије" / "Популарно", EN "Latest" / "Popular".
- Semantics change: "Популарно" sorts by **like count descending, ties by recency** —
  it is no longer oldest-first. "Најновије" stays newest-first and default.
- Viewer swipe order follows the active sort, unchanged mechanism.
- `dictionaries.ts`: replace both sort strings in both locales.

## 2. Uploader label on gallery tiles

Main gallery (1a/1b) and per-guest gallery (7b) tiles get a bottom-left label:

- Format **"First L."** — surname initial with a dot; omit " L." entirely if the guest
  gave no surname.
- Style: 11px, letter-spacing 0.04em, `#fffdf8`,
  `text-shadow: 0 1px 4px rgba(27,24,21,0.65)`, `left/bottom: 10px`,
  `max-width: 60%`, ellipsized, single line. **No pill, no scrim** — it sits opposite
  the glass heart pill.
- Not on profile (8a) or admin grids — those stay label-free squares.

## 3. Per-guest gallery (7b) — new screen

- Entry: the uploader pill in the viewer caption (see 4). No other entry points.
- Layout = main gallery verbatim (masonry, glass hearts, sort control), except:
  - Sticky top row: "← Галерија" back link instead of the brand mark.
  - Compact bar (always visible, no ceremonial masthead): guest's 34px avatar, name at
    19px Cormorant, "12 фотографија · 41 ♥" (11px, 0.16em).
  - No upload button.
- Viewer opened from here scopes swiping to this guest's photos; counter reads "3 / 12".
- Private photos never appear here.

## 4. Viewer caption is now an uploader button

Replaces the plain italic name in 7a's caption zone:

- A 999px pill: 1px `rgba(250,246,238,0.22)` border, `rgba(250,246,238,0.08)` fill,
  padding `5px 14px 5px 6px`, min-height 48px.
- Contents: 34px avatar circle (`rgba(250,246,238,0.16)` fill, initial in Cormorant 16px
  `#e8dcc0`), name at 21px Cormorant italic `#f0e7d2` over "12 фотографија" at 11px,
  and a "›" chevron at `rgba(250,246,238,0.55)`.
- Opens 7b.

## 5. Upload-window line in the masthead

In the live gallery's ceremonial masthead (1a), under the date line:

> "Додавање фотографија је отворено још N дана — после тога преузмите целу галерију."

12px, line-height 1.6, `rgba(43,38,32,0.62)`, centred, `max-width: 250px`. Scrolls away
with the masthead. N derives from the freeze date the couple sets in admin. Hidden once
the gallery is frozen (1b's thank-you card takes over).

## Data / state deltas

- Sorting needs `like_count` on the photo query (already stored for likes).
- Tile label needs the uploader's display name joined onto gallery photos (public ones
  only) — first name + optional surname initial computed client-side.
- A gallery-level `freeze_date` (or equivalent) to compute N for the masthead line.

## Not changed

Tokens, brand mark, upload flows (6a–6c), profile (8a), admin (9a–9d), download job
(13a–13c), errors (14a–14c), English layouts (11) beyond the two sort strings.
