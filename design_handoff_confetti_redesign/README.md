# Handoff: Confetti — wedding photo sharing redesign

Repo: **vladimir-ljubicic/confetti** (branch `main`, Next.js App Router)
Design file: `Gallery Directions.dc.html` (in this folder)
Locale: Serbian Cyrillic default, English secondary (existing `src/lib/dictionaries.ts`)

## Overview

A full visual and UX redesign of the guest-facing photo gallery, plus several flows the
current app does not have yet: a shrink-on-scroll masthead, a per-photo like, an optimistic
upload experience, a dark photo viewer, a guest profile page, a tabbed admin area, a
download-all job, and error states.

The current app already has: the gallery grid, sort toggle, locale toggle, upload button,
and the first-upload dialog. Those keep their responsibilities but change substantially in
layout, typography and behaviour. Everything else in this document is new.

### Core semantics (read first)

- **Sort:** "Најновије" / "Latest" = newest first (the default);
  "Популарно" / "Popular" = most-liked first (ties broken by recency). Same order drives
  viewer swiping.
- **Likes:** one like per guest per photo, toggled by tapping the pill; tied to the same
  local guest identity as their name, applied optimistically, count is the total.
- **Private photo** = visible only to its uploader and the couple (admin). "Сакриј" /
  "Учини приватном" flips a public photo to private — reversible, nothing is destroyed.
- **Обриши** (guest or admin) moves the photo to the admin bin (9c), where it can be
  restored for 30 days before permanent purge. Guests do not see the bin.
- **Intro sheet (4a)** appears only on a guest's first upload; afterwards uploads go
  straight to 6a/6b.
- **Upload window:** uploads stay open ~7 days after the wedding, then the couple freezes
  the gallery (1b) and bulk download opens to guests. The live gallery (1a) shows one line
  in the ceremonial masthead, under the date — "Додавање фотографија је отворено још N
  дана — после тога преузмите целу галерију." (12px, max-width 250px, centred) — seen on
  every arrival, scrolls away with the masthead. N derives from the freeze date the couple
  sets in admin.

## About the design files

`Gallery Directions.dc.html` is a **design reference written in HTML** — a set of 390×800
phone frames on one canvas, not production code. Do **not** copy its markup into the app:
it is inline-styled, hard-codes sample data, and fakes scroll behaviour inside a frame.

The task is to **recreate these designs in the existing Next.js + Tailwind codebase**, using
its established component patterns, its `dictionaries.ts` for copy, and its existing
Supabase/tus upload layer. Where this document gives an exact hex or px value, match it.

Open the HTML file in a browser to see all screens side by side. Each option carries a
visible id badge (`1a`, `6b`, `13c`…) matching the screen names below.

## Fidelity

**High fidelity.** Colors, type sizes, spacing, radii and copy are final. Recreate the UI
pixel-perfectly. The only deliberately fake parts are the photo placeholders (gradient
rectangles stand in for real images) and the sample counts/names.

---

## Design tokens

### Color

| Token | Hex | Use |
| --- | --- | --- |
| Paper | `#faf6ee` | Guest screen background |
| Card | `#fffdf8` | Cards, sheets, list rows, active segment |
| Paper alt | `#f4efe4` | Admin screen background |
| Sand | `#f1eadb` | Segmented-control track, avatar fill, info cards |
| Sand deep | `#e7dfcd` | Tab bar track |
| Gold tint | `#f7f0df` | Selected card fill, coach-mark tint |
| Gold | `#b08d3c` | Primary buttons, progress bars, focus borders |
| Gold small | `#8a6d2c` | Gold text, links, **active pills with 11–13px labels** |
| Gold deep | `#7a5f24` | Avatar initials, admin eyebrow label |
| Gold light | `#d9b866` | Confetti fleck, liked heart on photos |
| Ink | `#2b2620` | Body text, phone bezel, badges |
| Stage | `#1b1815` | Photo viewer background |
| Danger | `#9d4b4b` | Destructive text on light |
| Danger light | `#e39a9a` | Destructive text on dark |
| Warning bg | `#f7e9e3` | Offline / frozen notice |
| Warning text | `#8a4b2c` | Warning glyph |

Text opacities on ink: body `0.6–0.7`, meta `0.55–0.62`, hairlines `rgba(43,38,32,0.07–0.18)`.

> **Contrast rule learned during design:** `#b08d3c` on `#fffdf8` fails AA below 14px.
> Any pill, chip or button with an 11–13px label uses `#8a6d2c`; `#b08d3c` is only for
> 14px+ button labels and non-text fills (progress bars, borders).

### Typography

- **Display / names / captions:** Cormorant Garamond, weight 500 (italic 400 for captions).
- **UI:** Jost, weights 300–500. *The repo currently uses Geist — either add Jost or
  substitute the closest existing sans; do not mix both.*

| Role | Size / spacing |
| --- | --- |
| Ceremonial masthead names | 46px, line-height 1.02, Cormorant 500 |
| Masthead "и" | 31px italic, `#b08d3c` |
| Compact bar names | 19px, line-height 1.15 |
| Screen title (h2) | 28–32px Cormorant 500 |
| Sheet title (h3) | 29–30px Cormorant 500 |
| Viewer caption | 25px Cormorant italic |
| Eyebrow / label | 11–12px, uppercase, letter-spacing 0.16–0.28em |
| Body | 13–14px, line-height 1.5–1.6 |
| Meta | 12px |
| Primary button | 16px, weight 500 |
| Date line | 12px, letter-spacing 0.22em |

### Spacing, radii, shadows

- Screen gutters: 12px (photo grid), 14px (cards), 16–20px (text blocks).
- Grid gap: 8px (2-col masonry), 6px (3-col admin grid).
- Radii: 6px photo tiles, 8px thumbnails, 14px cards/inputs, 20px floating bars,
  `28px 28px 36px 36px` bottom sheets, 999px pills.
- Shadows: floating bar `0 14px 30px -10px rgba(43,38,32,0.5)`;
  card `0 18px 40px -18px rgba(43,38,32,0.45)`;
  bottom sheet `0 -20px 50px -20px rgba(43,38,32,0.4)`.
- **Minimum tap target 44px everywhere**, including text-only actions (pad, don't grow the label).

### Motion

```css
@keyframes fleck-fall {   /* logo flecks drop in */
  0%   { transform: translateY(-14px) rotate(0deg); opacity: 0; }
  30%  { opacity: 1; }
  70%  { transform: translateY(1px) rotate(190deg); opacity: 1; }
  100% { transform: translateY(0) rotate(180deg); opacity: 1; }
}
@keyframes fleck-drift {  /* then breathe forever */
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-2px) rotate(14deg); }
}
@keyframes av-pop {       /* avatar first appearance */
  0%   { transform: scale(0.3); opacity: 0; }
  55%  { transform: scale(1.16); opacity: 1; }
  75%  { transform: scale(0.96); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes burst {        /* confetti out of the avatar */
  0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
  25%  { opacity: 1; }
  100% { transform: translate(var(--bx), var(--by)) rotate(220deg); opacity: 0; }
}
@keyframes hint-in {
  0%   { transform: translateY(-7px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

Timings: `fleck-fall` 0.9s `cubic-bezier(.2,.8,.3,1)`, staggered 0.05s–0.62s;
`fleck-drift` 4.4–5.6s ease-in-out infinite, staggered;
`av-pop` 0.55s `cubic-bezier(.2,.8,.3,1.2)` after 0.15s;
`burst` 1.1s ×2, five flecks staggered 0.45–0.73s, vectors biased left/down so nothing clips
(`--bx/--by`: −30/−18, −8/−30, 6/−34, −34/14, −14/30);
coach mark `hint-in` 0.5s after 0.75s.

**Wrap all of the above in `@media (prefers-reduced-motion: reduce)` guards** — the flecks
should render in their settled position with no animation.

---

## The brand mark

Five confetti flecks beside the wordmark. Canonical geometry at 14px (scale proportionally;
18/20/22px variants exist in the design file):

| # | left | top | w | h | color | settled rotation |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 2 | 3 | 5 | `#b08d3c` | −24° |
| 2 | 5 | 0 | 3 | 4 | `#2b2620` | 32° |
| 3 | 9 | 3 | 3 | 5 | `#d9b866` | −12° |
| 4 | 3 | 8 | 3 | 4 | `#8a6d2c` | 48° |
| 5 | 8 | 9 | 2 | 3 | `#b08d3c` | −40° |

Each fleck is an absolutely positioned span, `border-radius: 1px`, inside a
`position: relative` box of the mark's size. Build it once as a `<ConfettiMark size>`
component — it appears in 20+ places.

- **Header (top-left):** animated — flecks fall on mount, then breathe. Runs once per page load.
- **Everywhere else** (sheet headings, notices, finished-job cards): static, settled rotations.

---

## Screens

### 1a — Live gallery (main screen)

The default screen. Guest arrives here from the QR link.

**Structure, top to bottom, in one vertical scroller:**

1. **Sticky top row** (`position: sticky; top: 0; z-index: 4`, background `#faf6ee`,
   padding `14px 18px 12px`): animated brand mark + "CONFETTI" (11px, uppercase,
   letter-spacing 0.2em, `rgba(43,38,32,0.45)`) on the left; on the right the language
   pill and, if the guest has introduced themselves, their avatar (32px circle,
   `#f1eadb` fill, 1px `rgba(43,38,32,0.15)` border, Cormorant 16px `#7a5f24` initial).
2. **Ceremonial masthead** (scrolls away, padding `16px 28px 26px`, centred):
   eyebrow "Венчање" (11px, 0.28em, `#b08d3c`); an `<h1>` "Јелена / и / Владимир" stacked on
   three lines, 46px Cormorant 500 `#8a6d2c` with the italic "и" at 31px `#b08d3c`;
   then a date line "20 · 09 · 2026" (12px, 0.22em) flanked by two 34×1px rules
   at `rgba(43,38,32,0.3)`.
3. **Compact bar** (`position: sticky; top: 57px; z-index: 3` — 57px is the rendered
   height of the sticky top row; compute or match it rather than hard-coding if the header
   changes,
   `background: rgba(250,246,238,0.94); backdrop-filter: blur(10px)`,
   1px bottom hairline, padding `9px 16px 12px`): on the left, names at 19px Cormorant plus
   "20.09.2026 · 184" (11px, 0.16em, `rgba(43,38,32,0.68)`) — **this block fades from
   opacity 0 to 1 over 0.22s once `scrollTop > 140`**, so it does not duplicate the
   masthead while both are visible. On the right, the sort segmented control
   (track `#f1eadb`, 3px padding, active segment `#fffdf8` + `#8a6d2c` +
   `0 1px 2px rgba(43,38,32,0.08)`, labels 12px: "Најновије" / "Популарно").
4. **14px spacer**, then the **photo grid**.
5. **Floating upload button** (`position: sticky; bottom: 24px`, centred,
   `pointer-events: none` on the wrapper and `auto` on the button): gold `#b08d3c`,
   ivory label 16px/500, padding `16px 28px`, radius 999px, a 20px "+" then
   "Додај фотографије". Grid gets `padding-bottom: 104px` to clear it.

**Photo grid:** two columns, 8px gap, `align-items: start`, each column a flex column so
tiles stagger (masonry look without JS). Tiles are 6px radius, varying heights
(140–235px in the mock), `overflow: hidden`, **nothing but the photo** — no names, no
timestamps underneath.

**Like control** (bottom-right of every tile, 8px inset): a single glass pill —
`display:flex; box-sizing:border-box; min-width:34px; height:34px; padding:0 10px;
border-radius:999px; background:rgba(27,24,21,0.58); backdrop-filter:blur(6px)`.
Inside: the glyph at 16px (`♥` `#d9b866` when liked, `♡` `#fffdf8` when not) and, only
when the count is non-zero, the count at 12px `#fffdf8`. `box-sizing: border-box` matters —
without it the padding is added to `min-width` and the unliked pill is never a circle.
Tapping toggles the like optimistically; the pill must still meet a 44px tap height
(achieved with `min-height:44px; padding-bottom:5px; margin-bottom:-5px` on the wrapper).

Tapping the photo itself opens the viewer (7a). Tapping the avatar opens the profile (8a).

### 1b — Frozen gallery

Same screen after the couple closes uploads. Differences only:

- A pinned notice under the compact bar (`position: sticky; top: 117px`, `#f1eadb`,
  14px radius, padding `14px 16px`): static 20px brand mark, then "Хвала вам!"
  (20px Cormorant `#8a6d2c`) and "Додавање нових фотографија је завршено. Галерија остаје
  овде — гледајте и преузимајте кад год желите." (13px, line-height 1.5).
- The floating button becomes secondary — `#fffdf8` fill, 1px `rgba(43,38,32,0.18)` border,
  `#8a6d2c` label — and reads "Преузми све фотографије". It opens 13a with the
  private-photo row removed (a guest can only take the public gallery plus their own
  private uploads).
- Masthead behaviour is identical to 1a.

### 2a — Empty state

No photos yet. The invitation is the content: no sort control, no counter, no grid.
Top row as in 1a but language pill only (no avatar — a guest with nothing uploaded has no
name yet). Then a vertically centred block (`flex: 1`, `justify-content: center`,
padding `0 34px 40px`, gap 22px): eyebrow, the stacked names at **48px**, the date line,
then "Галерија је још празна. / Прва фотографија је ваша." (22px Cormorant italic,
`rgba(43,38,32,0.7)`), the gold upload button (padding `16px 30px`), and a 12px footnote
"Фотографије виде сви гости, осим ако не изаберете другачије." capped at 250px wide.

### 4a — "Introduce yourself" bottom sheet

Appears **after** the guest has already picked files, so it reads as a step, not a gate.
The gallery behind it is blurred 3px at 0.5 opacity under a `rgba(43,38,32,0.42)` scrim.

Sheet: `#fffdf8`, radius `28px 28px 36px 36px`, padding `12px 22px 26px`, gap 20px,
a 38×4px grab handle centred at the top.

1. **Centred heading block:** static 22px brand mark, "Представите се" (30px Cormorant
   `#8a6d2c`), then "Име се приказује уз ваше фотографије.`<br>`Питамо само први пут."
   — 13px, line-height 1.55. The explicit `<br>` is deliberate: balancing left a single
   word stranded on line two.
2. **Two name fields side by side** (10px gap, each `flex:1; min-width:0`):
   "ИМЕ" (required, focused state — 1px `#b08d3c` border, `#faf6ee` fill, 17px value,
   2px caret) and "ПРЕЗИМЕ · необавезно" (optional — 1px `rgba(43,38,32,0.16)` border,
   placeholder at `rgba(43,38,32,0.5)`). Labels 11px uppercase 0.16em; the "необавезно"
   qualifier is inline, non-uppercase, `rgba(43,38,32,0.6)`.
3. **Visibility choice as two cards** (9px gap, each `flex:1`, 14px radius, padding 14px):
   selected = 1.5px `#b08d3c` border + `#f7f0df` fill; unselected = 1px hairline + `#fffdf8`.
   Card 1 "Сви гости" / "У галерији за све"; card 2 "Само младенци" / "Приватно, ви и ми".
   Title 15px, sub 12px.
4. **Primary button** full width, gold, 17px padding: "Сачувај и отпреми 4 фотографије"
   (count interpolated). Below it a centred "Откажи" with a 44px tap height.

On save: persist the name locally, close the sheet, start the upload, and trigger the
avatar arrival animation (12a).

### 6a — Uploading, 1–10 photos (the common case)

**Never a blocking overlay, and no filenames anywhere** — filenames mean nothing on a phone.

Drawn in the scrolled position (compact bar visible, no ceremonial masthead) because a guest
who is uploading has already been greeted.

Local thumbnails are inserted **into the top of the grid immediately** as optimistic tiles:

- **In flight:** `rgba(43,38,32,0.34)` scrim over the photo, a centred 44px progress ring
  (`conic-gradient(#fffdf8 0turn Nturn, rgba(255,253,248,0.28) Nturn 1turn)`) with a 34px
  `rgba(43,38,32,0.55)` inner disc showing the percentage at 11px. A 44×44 "✕" sits at
  the tile's top-right (ivory, `text-shadow: 0 1px 3px rgba(27,24,21,0.6)`) and cancels
  just that upload.
- **Done:** the scrim and ring are removed and the like pill appears — the tile becomes an
  ordinary gallery tile in place.
- **Failed:** `rgba(43,38,32,0.5)` scrim and a centred ivory pill "↺ Пробај поново".
- A photo becomes visible to other guests **only once fully uploaded**.

Cancelling leaves the tile in place briefly as "Отказано · Врати" before it disappears.

### 6b — Uploading, 10+ photos

The optimistic tiles are *not* used here; per-file rows are noise at 100 files. Instead the
grid shows the existing gallery and **one sticky mini-bar** at the bottom
(`left/right: 12px; bottom: 16px`, `#fffdf8`, 20px radius, 1px hairline, card shadow,
padding `14px 16px 15px`):

- Row 1: 38px thumbnail of the photo currently uploading; then
  "Отпремање 34 од 100" (14px) with "око 3 мин" right-aligned (12px), and under them a
  5px progress track (`#eee5d2`) with a `#b08d3c` fill; then a 44px "Откажи" (13px,
  `#8a6d2c`).
- Row 2: "Држите страницу отвореном — можете листати и лајковати док траје." (12px).

Behaviour: fully non-blocking — the guest can scroll, like, and open photos. Request a
`navigator.wakeLock` for the duration of a bulk batch (mobile browsers kill uploads when
the tab backgrounds; tus resumption only helps if they return). **Refresh the gallery
incrementally, roughly every 10 completions**, not once at the end.

### 6c — Batch finished

The mini-bar becomes a summary card in the same position: static 18px brand mark,
"97 фотографија отпремљено" (14px) and "3 нису успеле" (12px), plus a gold
"Пробај поново" pill (44px) that retries only the failures. Self-dismisses.

### 7a — Photo viewer

Dark stage so photos hold their own colours; album typography so it still feels like the
invitation. Background `#1b1815`, full height, three vertical zones:

1. **Top row** (padding `18px 18px 0`): a 40px "✕" at the left, the position counter
   "14 / 184" centred (11px, 0.18em, `rgba(250,246,238,0.55)`), and a 24px spacer right.
   **No overflow menu, no page dots** — dots imply a handful of items; the counter carries
   position for 184 photos.
2. **Photo** — `flex: 1; min-height: 0`, centred, 14px vertical padding, photo at 100%
   width. Swipe left/right moves through the feed in its current sort order.
3. **Caption + actions** (padding `20px 18px 26px`, gap 13px):
   uploader name in 25px Cormorant italic `#f0e7d2`, then the date line
   "20.09.2026 · 21:47" (11px, 0.18em) flanked by two 26×1px rules at
   `rgba(250,246,238,0.22)`. Below: a row of three — ivory "Преузми" (`#faf6ee` fill,
   `#2b2620` label, flex 1), a like pill (1px `rgba(250,246,238,0.28)` border, `♥`
   `#d9b866` + count), and a 50px share circle "↗" (native share sheet).
   Then a centred row "Учини приватном" / "Обриши" (`#e39a9a`), each 44px tall —
   **shown only on the guest's own photos, and on every photo in the admin view.**

There is no separate admin photo screen: admin sees this same viewer with the
private/public switch and delete always enabled.

**The uploader in the caption is a visible button, not a text link:** a 999px pill with a
1px `rgba(250,246,238,0.22)` border and `rgba(250,246,238,0.08)` fill, containing their
34px avatar, name at 21px Cormorant italic, "12 фотографија" at 11px, and a "›" chevron.
It opens that guest's gallery (7b below). This is the discoverable path from any photo to
its author — the feed itself stays photos-only by design.

### 7b — One guest's gallery (guest-facing)

Reached only from the viewer caption. **The main gallery verbatim** — same 2-column
staggered grid, same glass like pills, same sort control — with three differences:

- The sticky top row's left side is a "← Галерија" back link instead of the brand mark.
- The pinned compact bar carries the guest instead of the couple: their 34px avatar,
  name at 19px Cormorant, and "12 фотографија · 41 ♥" (11px, 0.16em). No ceremonial
  masthead — the compact bar is always shown.
- No upload button — it is someone else's page.

Opening a photo from here scopes the viewer's swipe order to this guest's photos only,
and its counter reads against their count ("3 / 12"). Private photos never appear here
(only the uploader and the couple can see them anywhere).

### 8a — My photos (guest profile)

Reached by tapping the header avatar. Background `#faf6ee`.

1. **Select-mode bar** at the very top (`#f7f0df`, 1px `rgba(176,141,60,0.28)` bottom
   border, padding `12px 12px 12px 8px`): "✕ Изађи из избора" on the left (14px, 44px
   tall) and "Изабери све" on the right (13px `#8a6d2c`). This replaces a quiet "Готово"
   in the corner — selection mode must announce itself and offer an obvious exit.
   *When not in select mode this bar is the ordinary "← Галерија" row.*
2. **Title block:** "Моје фотографије" (30px Cormorant) + "12 отпремљених · 41 лајк" (13px).
3. **Default-visibility card** (`#f1eadb`, 14px radius): "Нове фотографије виде`<br>`сви
   гости" with a segmented control "Сви" / "Приватно" (active `#8a6d2c`).
4. **Visibility filter chips:** "Све 12" (active, `#8a6d2c` fill) / "Јавне 10" /
   "Приватне 2" (1px hairline, `rgba(43,38,32,0.65)` label).
5. **3-column grid**, 6px gap, square tiles. Each tile carries a 20px selection circle at
   its top-right — filled `#b08d3c` with an ivory ✓ when selected (plus a
   `rgba(176,141,60,0.3)` wash over the photo), or a 1.5px `rgba(255,253,248,0.85)`
   ring when not. Private photos carry a "Приватна" chip at the bottom-left
   (`rgba(27,24,21,0.7)`, 10px).
6. **Selection action bar** (`left/right: 14px; bottom: 18px`, `#fffdf8`, 18px radius,
   1px hairline): "2 изабране" on the left, then "Сакриј" (`#8a6d2c`) and "Обриши"
   (`#9d4b4b`), each a 44px pill.

**No admin entry point on this page.** Admin lives on its own route.

### 9 — Admin

Own route, unlocked once per device by a private link with a token (e.g. `/admin?k=…`,
then remembered in local storage). Nothing in the guest UI links here. Background `#f4efe4`.

Shared chrome: a "← Галерија" back link on the left; on the right, the static brand mark +
"АДМИНИСТРАЦИЈА" (12px, 0.16em, `#7a5f24`) **and the language pill** — admin needs it too.
Below the title block, a three-tab bar: track `#e7dfcd`, 4px padding, active tab
`#fffdf8` + `#8a6d2c`, labels 13px — "Фотографије" / "Гости" / "Корпа 3".

#### 9a — Фотографије tab

Title "184 фотографије", sub "37 гостију · 6 приватних".
**Horizontally scrollable filter chips** (`overflow-x: auto`, hidden scrollbar,
`-webkit-overflow-scrolling: touch`, each chip `flex-shrink: 0`) — "Сви" (active),
"Приватне 6", then one chip per guest ("Никола 12", "Ана 9", …); there can be dozens.
Then the 3-column grid with "Приватна" chips, and a 12px hint
"Додирните фотографију за скривање, објављивање или брисање." at
`rgba(43,38,32,0.68)`. Pinned to the bottom, a two-row settings block (`#fffdf8` rows,
1px hairline, radii only on the outer corners):
"Отпремање гостију" with an "Отворено / Замрзнуто" segmented control, and
"Преузми све · ZIP, 4.2 GB →" which opens 13a.

#### 9b — Гости tab

Title "37 гостију", sub "Додирните госта за његове фотографије".
One `#fffdf8` row per guest (14px radius, 8px gap): 40px avatar circle, name (15px) and
"12 фотографија · 2 приватне" (12px), a "Преименуј" pill (44px, 1px hairline,
`#8a6d2c`), and a "›" chevron at `rgba(43,38,32,0.35)` — the whole row navigates to 9d.
The row being renamed switches to an inline editing state: 1.5px `#b08d3c` border on the
row, the name replaced by a text input (`#faf6ee`, 1px `#b08d3c`, 10px radius) and a gold
"Сачувај" pill. Renaming only changes the display name guests see.

#### 9c — Корпа tab

Title "Корпа", sub "Обрисане фотографије се трајно бришу после 30 дана" — stated once here
rather than repeated per row. One row per deleted photo: 56px thumbnail dimmed with
`rgba(27,24,21,0.4)`, "Никола · 21:31" (14px) and "Обрисана данас" (12px), and a gold
"Врати" pill (44px). Pinned at the bottom: a "Врати све · 3 фотографије →" row and a
centred destructive "Испразни корпу" (`#9d4b4b`).

#### 9d — One guest

Reached from a guest row (9b) or a guest chip (9a). Header: 52px avatar, name at 28px
Cormorant, "12 фотографија · 41 лајк" (13px, `white-space: nowrap`), and a "Преименуј"
pill. Then the same "Све / Јавне / Приватне" chips and a 3-column grid of that guest's
photos. Pinned settings block, three rows:

- "Отпремање за овог госта" / "Затвара дугме, фотографије остају" with a
  "Дозволи / Забрани" segmented control. **Забрани simply removes the upload button for
  that guest** — their existing photos stay visible and untouched.
- "Сакриј све од овог госта · 12 →"
- "Преузми све од овог госта · ZIP →"

### 11 — English

Same components, English copy from `dictionaries.ts`. Latin runs ~20% longer; the two
pressure points both hold without wrapping and are worth a regression check:

- **Compact bar** (11a): "Jelena & Vladimir" + "20.09.2026 · 184" on the left,
  "Latest / Popular" segmented control on the right, one line, 390px wide.
- **Intro sheet** (11b): "First name" / "Surname · optional" side by side,
  "All guests / Couple only" cards, and "Save and upload 4 photos" — the longest string in
  the app — on one line at 16px.

Language pill: active segment `#8a6d2c` with ivory label, inactive
`rgba(43,38,32,0.6)`, both 11px with 0.1em tracking, inside a 1px hairline pill.
Same treatment on **every** screen including admin. (Flags were considered and rejected —
they read poorly for a Serbian/English pair.)

### 12a — The avatar arrives

Runs **once**, the moment the intro sheet closes and the avatar appears where there was
nothing before.

1. The 32px avatar scales in with `av-pop`.
2. Five confetti flecks burst out of it (`burst`, ×2, vectors biased left and down so
   nothing clips the viewport edge).
3. A coach mark drops in under it (`hint-in`, 0.5s after 0.75s): `#fffdf8` card, 1px
   hairline, 14px radius, ink text 13px, card shadow, with an 11px rotated square as the
   arrow (its top and left borders hairlined so it reads as part of the card) offset 16px
   from the right edge so it points at the avatar. Copy: "Ваше фотографије су овде",
   then a 44px "✕".
4. Dismissed on tap, on scroll, or after six seconds; **never shown again** (persist a flag).

### 13 — Download everything

#### 13a — Confirmation sheet

Opened from "Преузми све" in 9a (or from 1b for a guest). Bottom sheet over the blurred
admin grid. Centred heading "Преузми све" (29px Cormorant) + "Припрема ZIP датотеке траје
неколико минута." Then a three-row summary block (`#faf6ee` rows, 1px hairline):
"Фотографије · 184 · оригинали"; "Приватне" with an "Укључи / Изостави" segmented control;
"Величина · око 4.2 GB". Then the full-width gold "Припреми ZIP".
**Guests get this same sheet with the "Приватне" row removed** — they can only take the
public gallery plus their own private uploads.

#### 13b — Job running

The sheet collapses to a card at the bottom of the admin tab (same geometry as 6b's
mini-bar): animated 18px brand mark, "Припрема ZIP · 118 од 184" with "око 2 мин",
a progress track, then "Паковање се обавља на серверу. Можете затворити страницу и
вратити се — линк за преузимање чека овде." and a destructive "Откажи припрему".

Semantics the copy must not overstate: zipping happens **server-side and continues
regardless of the page**; there is **no push notification**; if the user leaves and comes
back, the card is simply in its 13c state. **No shareable link is offered until the ZIP
exists** — a link that 404s for whoever it was forwarded to is worse than no link.

#### 13c — ZIP ready

Same card, 1px `rgba(176,141,60,0.4)` border, static (not animated) brand mark:
"ZIP је спреман · 4.2 GB" and "184 фотографије · линк важи до 03.09."; then a gold
"Преузми сада" (48px, flex 1) and a "Копирај линк" pill. The link stays valid 7 days.
Stays until dismissed or expired.

### 14 — Error states

Venues have bad signal and guests copy links badly. Each state says what happened and what
to do; never a raw error string.

#### 14a — Dead or expired link

The only full-screen failure. Header is the brand mark + language pill only (no avatar, no
gallery). Centred block: a 22px brand mark rendered in **desaturated palette colours**
(each fleck at 0.35–0.5 alpha) — the mark itself signals "nothing here";
"Овај линк`<br>`не важи" (32px Cormorant); then 14px body capped at 270px:
"Можда је истекао или је погрешно прекопиран. Скенирајте QR код са стола или замолите
младенце за нови линк."; then a secondary "Пробај поново" (48px, `#fffdf8`, hairline).

#### 14b — Offline with uploads queued

Ordinary gallery chrome, plus a notice card under the compact bar (`#f7e9e3`, 14px radius):
an "!" glyph at `#8a4b2c`, "Нема интернета" (14px), "3 фотографије чекају у реду.
Настављамо саме кад се веза врати — не затварајте страницу." (12px), and a 40px
"Пробај сада" pill on `#fffdf8`. Queued tiles sit in the grid under a
`rgba(43,38,32,0.42)` scrim labelled "чека" (12px, ivory). The queue resumes itself.

#### 14c — One photo rejected

The rest of the batch lands normally. A card at the bottom (6c geometry): 44px thumbnail of
the offending photo, "1 фотографија није прошла" (14px), "Већа од 25 MB · 6 отпремљено"
(12px), then a gold "Пробај поново" and an "Изостави" pill. Never blocks the successful
photos.

---

## Interactions & behaviour summary

| Trigger | Result |
| --- | --- |
| Scroll gallery past 140px | Compact bar's name/date block fades in over 0.22s |
| Tap tile | Photo viewer (7a) |
| Swipe in viewer | Previous/next photo in current sort order |
| Tap uploader pill in viewer | That guest's gallery (7b), viewer swipe scoped to them |
| Tap like pill | Optimistic toggle; `♡` ivory ⇄ `♥` `#d9b866`; count updates |
| Tap upload | Native file picker; first time → intro sheet (4a) after picking |
| Save intro sheet | Persist name; start upload; play avatar arrival (12a) once |
| ≤10 files | Optimistic tiles at top of grid with rings + per-tile ✕ (6a) |
| >10 files | Mini-bar only (6b); wake lock; refresh grid every ~10 completions |
| Batch ends | Summary card (6c), retry failures only |
| Tap avatar | Profile page (8a) |
| Long-press tile in profile | Enter select mode (bar at top, circles on tiles) |
| Freeze uploads (9a) | Guests see 1b; upload button becomes download |
| Забрани for one guest (9d) | That guest's upload button disappears; photos stay |
| Припреми ZIP (13a) | Server-side job; card persists across navigation (13b → 13c) |
| Offline mid-upload | Queue holds, notice card, auto-resume (14b) |

## State

Client: `locale`, `guestName`, `defaultVisibility`, `sortOrder`, `likes` (optimistic set),
`uploadQueue` (per item: thumbnail blob URL, progress, status
`queued|uploading|done|failed|cancelled`), `coachMarkSeen`, `selectMode` + `selectedIds`,
`adminToken`, `zipJob` (`idle|packing|ready|expired` + progress + url + expiry).

Server: photo records need `visibility`, `guest_id`, `like_count`, `deleted_at`
(30-day purge for the bin); guests need `display_name` and `uploads_blocked`;
gallery-level `uploads_frozen`; a ZIP job table with a 7-day signed URL.

## Assets

None. The brand mark is CSS-only (five positioned spans). Photo placeholders in the design
file are `linear-gradient(150deg, …)` rectangles standing in for real images — replace with
the actual thumbnails.

## Files in this bundle

- `Gallery Directions.dc.html` — all screens on one canvas, ids matching this document.
- `README.md` — this file.

## Changelog since the first handoff

- **Sort toggle is now Најновије/Популарно (Latest/Popular)** — popular sorts by like
  count, ties by recency. Applies everywhere the control appears (1a, 1b, 6a–6c, 7b, 11a).
- **Uploader label on gallery tiles:** bottom-left of every tile in the main and per-guest
  gallery, "First L." (surname initial omitted if not given) — 11px ivory, 0.04em,
  `text-shadow: 0 1px 4px rgba(27,24,21,0.65)`, `max-width: 60%`, ellipsized, no pill.
- **Per-guest gallery (7b)** and the **uploader pill in the viewer** — see §7a/7b.
- **Upload-window masthead line** — see Core semantics.
- **Masonry stays** in the main and per-guest galleries; uniform squares stay in
  profile/admin grids. Intentional split: browsing vs. managing.

## Suggested implementation order

Not screen by screen. Land it in five passes so the app is never half-styled:

1. **Tokens + brand mark + header/masthead** — colors, fonts, `<ConfettiMark>`,
   sticky top row, ceremonial masthead, compact bar with the scroll fade, language pill.
   Everything else inherits from this.
2. **Feed** — 2-column staggered grid, photos only, glass like pill, sort control,
   floating upload button, empty state (2a), frozen state (1b).
3. **Upload rework** — intro sheet (4a), optimistic tiles (6a), bulk mini-bar (6b),
   summary (6c), plus 14b/14c. This is the biggest logic change: incremental refresh,
   per-item cancel, wake lock.
4. **Viewer + profile** — 7a (with owner/admin actions) and 8a with select mode.
5. **Admin route** — token unlock, three tabs (9a–9c), guest page (9d), ZIP job (13a–13c),
   and 14a.
