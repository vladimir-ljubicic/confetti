# Alignment brief: bring the code up to the current design

**Task for Claude Code:** every screen listed here already exists in the app. Do not rebuild
them — audit each one against this spec and change only what differs. The visual reference is
`Gallery Directions.dc.html` in this folder: open it in a browser, find the screen by its id
badge (1a, 5c, 11a…), and match it.

Two companion documents in this folder still apply and are not repeated here:
`REVIEW-open-items.md` (motion, gestures, history, sort semantics, large-gallery behaviour)
and the earlier `README.md` / `DIFF-*.md` handoffs (product rules, flows, copy).

---

## 0. Design tokens — check these first, they explain most drift

```
ink            #2b2620      body text, dark surfaces
gold           #b08d3c      primary buttons, active borders
gold deep      #8a6d2c      headings, active pills, links
gold light     #d9b866      liked heart, mark accent
ivory page     #faf6ee      screen background
ivory raised   #fffdf8      cards, sheets, controls on ivory
ivory sunken   #f1eadb      toggle tracks, avatars, inline blocks
ivory hover    #f7f0df      hover on ivory controls
warm border    rgba(43,38,32,0.07 – 0.18)
muted text     rgba(43,38,32,0.55) minimum — never 0.45, never below 12px
danger         #9d4b4b      words only; never tint a whole row or card
```

Type: **Cormorant Garamond** 500 for headings, names and numbers with ceremonial weight;
**Jost** 300/400/500 for everything else. No other families — a native `<input type="date">`
renders in the system font and breaks this; style it or replace it.

Shape: pills are `border-radius: 999px`, cards 14px, sheets 28px top corners, photo tiles 6px.
Every tappable target is at least 44px tall.

No pink, no red surfaces, no gradients other than the photo placeholders, no emoji.

---

## 1. What the current build gets wrong (observed on device)

These were seen in screenshots of the running app and are the highest-value fixes.

1. **A floating dark avatar button (bottom-left) overlaps content on admin screens.**
   It covers the text of the *Преузми све* bar and the *Откажи* link on the download sheet.
   The design has no floating avatar anywhere: the avatar lives in the guest header only, and
   admin screens (11a–11d, 10a–10c) do not show it at all. Remove it from those routes.
2. **ZIP progress reads `0 од 0`.** 10b specifies a real counter (`Припрема ZIP · 118 од 184`),
   an ETA (`око 2 мин`) and a **Откажи припрему** action. The build has none of the three and
   shows explanatory prose instead.
3. **No way into select mode on 11a.** The *Изабери* pill plus the line *Или дуго притисните
   било коју фотографију* is missing; long-press alone is undiscoverable. Same block exists on
   8a and 11d — reuse it verbatim.
4. **Native date input in the freeze block.** `20. 09. 2026.` with the browser calendar glyph,
   plus a *Замрзни после (дана)* row, are not in the design. If the feature stays, give it the
   app's own control styling (ivory raised, 14px radius, Jost, 44px tall) — never raw browser
   chrome.
5. **`Приватна` badge is bottom-left and oversized.** Design: top-left, 10px text, 3×7px
   padding, `rgba(27,24,21,0.72)`, `#faf6ee` text.
6. **10a lacks the private-photos toggle** (`Приватне · Укључи / Изостави`). The couple choose
   whether private photos go into the ZIP.
7. **10a's button says `Преузми ZIP`; it must say `Припреми ZIP`.** The flow is prepare (10b) →
   ready (10c) → download. A download label on a 4 GB job promises something the app cannot do
   yet.

---

## 2. Screen-by-screen spec

Ids match the board. "Same header" means the pinned bar described in §3.

### 1a · Confetti mark
Five flecks beside the wordmark, gold/ink palette, fixed geometry (see the board's SVG-free
markup; scale proportionally, never redraw). Entrance: each fleck springs in (`av-pop`,
0.5s, staggered 0.05–0.36s) while five sparks fly outward and fade (`burst`, 0.85s). Then a
slow `fleck-drift` sway, ~5s, infinite. Plays once per app load; respects
`prefers-reduced-motion`.

### 2a · Empty album
No sort toggle, no counter — the ceremonial masthead *is* the screen. Венчање · names ·
date rule · one line of invitation · gold **Додај фотографије** button · one line about
visibility. No dashed empty box.

### 3a · Introduce yourself (first upload only)
Bottom sheet, two states, both in the design:
- **At rest:** mark, heading, two explanatory lines, Име + Презиме (optional), two visibility
  cards (Сви гости / Само младенци) with descriptions, action bar (Откажи + gold primary).
- **Keyboard open:** no mark, no explanatory lines, heading on one 22px line with *Питамо само
  први пут* beside it, visibility collapsed to two pills, same action bar.
Rules: **never autofocus**; switch to the compact state on `visualViewport` resize; size the
sheet from `visualViewport.height`, never `100vh`/`100dvh`; the middle scrolls between a
pinned header and a pinned action bar. Enter on Име → Презиме, Enter on Презиме → submit.

### 4a · The avatar arrives
After the first upload the avatar pops into the header (`av-pop` 0.62s at 0.15s) with a gold
ring pulsing infinitely (`av-ring` 1.9s) and eight confetti sparks exploding outward on a
repeating 4s cycle (`burst-cycle`). A coach mark — *Ваше фотографије су овде* with a ✕ —
points at it, enters with `hint-in`, then nudges every 3.2s (`hint-nudge`, arrow scales with
`hint-arrow`). While the coach mark is up the sort toggle behind it is dimmed to 28% so the
overlap reads as intentional; it returns to full opacity when the mark is dismissed.
Tapping the avatar opens 8a.

### 5a · Small batch (1–10)
No blocking overlay, no filenames. Tiles drop into the top of the feed immediately with the
local thumbnail, dimmed under a progress ring (72%, 31%…), un-dimming as each finishes; ✕
cancels one mid-flight. **A failed tile states its reason on the tile** — `Прекинута веза /
Није отпремљена` — above **Пробај поново**. Errors retrying cannot fix (too large, not an
image) show **Изостави** instead. Switch the sort to Најновије automatically when an upload
starts.

### 5b · Bulk batch (10+)
One sticky ivory mini-bar: gold progress line, `Отпремање 34 од 100`, ETA, the photo currently
going up, a single **Откажи**, and the line *Држите страницу отвореном — можете листати и
лајковати док траје.* Non-blocking; refresh the grid every ~10 completions, not once at the
end. Take a `navigator.wakeLock` for the duration.

### 5c · Batch finished
One ivory summary card closes every batch, large or small: mark, `97 фотографија отпремљено`,
a tappable failure line `3 нису успеле ▸ види које` (opens 5d), and two stacked actions —
gold **Пробај поново** and outlined **Одбаци**. Dismisses itself.

### 5d · What failed, and why
Sheet capped at 82% of the screen: pinned header (`14 нису отпремљене` · `86 успело`),
scrolling list, pinned action bar (Одбаци + gold `Пробај поново 12`). Rows are identified by
thumbnail, never filename, and grouped: **Можемо да пробамо поново · 12** (each row: reason,
progress/size, outlined **Поново**) and **Ово не можемо да отпремимо · 2** (each row: red
*words*, ivory surface like every other row, outlined **Изостави**). Reasons in plain language:
Веза је прекинута, Сервер није одговорио, Превелика датотека, Није фотографија.

### 6a · Main gallery (the app's front door)
Ceremonial masthead — Венчање, names stacked, date rule — that **shrinks on scroll** into a
pinned bar (names + date + count on the left, sort toggle on the right). One line under the
masthead: *Додавање фотографија је отворено још 6 дана — после тога преузмите целу галерију.*
Two-column masonry grid, photos only, each tile carrying a glass like pill bottom-right
(♡ / gold ♥ + count) and the uploader's name bottom-left as *Име П.* Floating gold **Додај
фотографије** pill, centred, always reachable. Infinite scroll ~30 per page; new photos from
other guests arrive behind a *Нове фотографије ↑* pill, never inserted mid-scroll.

### 6b · Uploads closed
Same gallery after the freeze: no upload button, a **Хвала вам!** block with the totals
(31 / 12 / 47) and an outlined **Преузми све фотографије**.

### 6c · Deep in a large gallery (1000+)
Round ↑ **back-to-top button, bottom-left**, 48px, appearing after ~2 screens; never a target
at the top of the screen. Right-edge scrub rail: invisible at rest, fades in while scrolling,
12×56px thumb with a 44px touch target, bubble only while dragging. The bubble states the
**active sort key** — time of day in Најновије (`22:15 · Субота вече`), like band in
Популарно (`10+ ♥ · Вољене`; bands from the album's own distribution, roughly the 90/60/30
percentiles). Mount the rail only above ~300 photos. While dragging, show flat `#f1eadb`
placeholders and fetch images when the finger lifts.

### 7a · Photo viewer
Dark stage `#1b1815`. Top: counter `14 / 184` and ✕. Bottom: uploader avatar + name +
`12 фотографија` (tapping the name opens 9a), timestamp, then Преузми · ♥ 12 · Учини
приватном · Обриши (last two only on your own photo, or for admin on any photo). Opens with a
shared-element zoom from the tapped tile; swipe left/right through the same order as the
gallery; **swipe down to dismiss** (down only, threshold 110px or velocity 0.5px/ms, photo
follows the finger with scale 1→0.88 and the backdrop thinning); back gesture closes the
viewer, not the page (`pushState` one entry, `?photo=<id>`, `replaceState` while swiping).
Closing returns to the **last** photo seen, not the first.

### 8a / 8b · My photos
8a is the default: back to Галерија, language toggle, heading + `12 отпремљених · 41 лајк`,
a *Нове фотографије виде* Сви/Приватно preference, the Све/Јавне/Приватне filter row, then
the **Изабери** pill with *Или дуго притисните било коју фотографију* beside it, a 3-column
square grid, and an outlined **Преузми своје фотографије**.
8b is select mode: top row is only **Изађи из избора** + a quiet `2 / 12`; the action bar
carries **Изабери све 12** as a checkbox chip (becomes a filled ✓ *Опозови избор* when all are
selected, and respects the active filter), `2 изабране`, **Сакриј**, **Обриши**.

### 9a · One guest's gallery
The main gallery scoped to one guest — same masthead treatment, same masonry, same like pills.
Header: back to Галерија, the guest's name, `12 фотографија · 41 ♥`, same sort toggle.
Reached by tapping the uploader's name in 7a.

### 10a / 10b / 10c · Download everything
Shared by admin and by a guest downloading their own photos; the copy notes whose photos are
in scope.
- **10a** sheet: mark, **Преузми све**, *Припрема ZIP датотеке траје неколико минута.*, three
  rows — Фотографије `184 · оригинали`, Приватне with an **Укључи / Изостави** toggle,
  Величина `око 4.2 GB` — gold **Припреми ZIP**, then Откажи.
- **10b**: an inline card on the page, not a modal: `Припрема ZIP · 118 од 184`, gold progress
  line, `око 2 мин`, **Откажи припрему**. Packing continues server-side if the page is closed;
  the state is picked up again on return.
- **10c**: `ZIP је спреман · 4.2 GB`, `184 фотографије · линк важи до 03.09.`, **Преузми сада**
  and **Копирај линк**. The link only exists once packing has finished.

### 11a–11d · Admin
One screen, three tabs (Фотографије / Гости / Корпа N) plus a drill-down.
- **11a Фотографије:** heading `184 фотографије` · `37 гостију · 6 приватних`; horizontally
  scrollable filter pills (Сви, Приватне 6, then one per uploader with counts); 3-column square
  grid with top-left `Приватна` badges; the **Изабери** pill + long-press line; then the
  freeze block (*Отпремање гостију* · Отворено / Замрзнуто) and the **Преузми све · ZIP, 4.2 GB →**
  bar. Admin sees every photo as if it were their own: tapping one opens 7a with delete and
  public/private controls.
- **11b Гости:** `37 гостију`, *Додирните госта за његове фотографије*, one row per guest with
  counts and inline **Преименуј** (turns into a field + **Сачувај**).
- **11c Корпа:** deleted photos newest first, *Обрисане фотографије се трајно бришу после 30
  дана*, per-row **Врати**, then **Врати све** and a quiet red **Испразни корпу**.
- **11d One guest:** avatar, name, counts, Преименуј, the same filter row + Изабери pill, grid,
  then *Отпремање за овог госта* (Дозволи / Забрани — removes that guest's upload button while
  keeping their photos), **Сакриј све од овог госта** and **Преузми све од овог госта**.

### 12a / 12b · English
The same screens with English strings — the longest copy in the app. Latest / Popular,
Add photos, Introduce yourself, First name / Surname · optional, All guests / Couple only,
Save and upload 4 photos. Check the pinned bar and both sheets do not wrap or clip.

### 13a / 13b · When things break
- **13a Dead link:** the only full-screen error. Muted mark (45% opacity), *Овај линк не важи*,
  **Пробај поново**.
- **13b Offline:** ivory banner with a red `!` and red *Нема интернета* (no pink surface),
  *3 фотографије чекају у реду. Настављамо саме кад се веза врати — не затварајте страницу.*,
  **Пробај сада**; queued tiles are dimmed and labelled `чека`.
Rejections belong to the upload that produced them: the reason is on the failed tile (5a) and
in the list behind the summary (5c → 5d), never a separate error screen.

---

## 3. Cross-screen rules

**Header.** Guest screens: mark + *Confetti* on the left, language toggle (СР / EN) and avatar
on the right — avatar and language are separate controls; tapping the avatar opens 8a. Admin
screens: back link + mark + *АДМИНИСТРАЦИЈА* + language toggle, no avatar. A guest with no
uploads has no avatar but still has the language toggle.

**Sort.** *Најновије* (default) and *Популарно*. Popularity ties break by newest. Hide the
toggle entirely until the album has ≥10 likes in total, otherwise the two orders look
identical and the control reads as broken. Changing sort scrolls to top instantly and restores
the full masthead; remember a scroll position per sort within the session.

**Likes.** One per guest per photo, optimistic, total count shown. Heart is white outline when
unliked, gold `#d9b866` filled when liked, inside a glass pill bottom-right on the tile.

**Private vs deleted.** Private = visible to its uploader and the couple. Delete moves to the
admin bin (11c) for 30 days. Guests never see the bin.

**Identity.** Name + optional surname, asked once, stored locally; shown as *Име П.* on tiles.

**Motion.** Shared-element zoom into the viewer; 200ms fade + scale for new tiles; 220ms heart
bounce; 280ms sheet slide with drag-to-dismiss; 160ms tab cross-fade. No page-slide route
transitions, no parallax, no shimmer skeletons — flat `#f1eadb` blocks that cross-fade out.
Everything honours `prefers-reduced-motion`.

**Accessibility.** 44px targets, muted text no lighter than `rgba(43,38,32,0.55)`, nothing
below 12px, and every icon-only control gets a label.
