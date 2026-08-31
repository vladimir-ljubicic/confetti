# Drift audit — implementation vs design handoff v3

Audited 2026-08-31 against `docs/design/design_handoff_confetti_redesign/` (ALIGN-code-to-design.md,
README.md, DIFF-v2-to-v3.md, REVIEW-open-items.md, Gallery Directions.dc.html). Static code
audit; anything needing a live device is under **Unverified**. The designer's screenshot
feedback is ALIGN §1 (no separate comment threads exist in the canvas file). Screen ids
below use the new (ALIGN) numbering.

---

## 1. ALIGN §1 scoreboard — the seven screenshot defects

| # | Reported | Verdict |
|---|---|---|
| 1 | Floating dark avatar bottom-left on admin | **Not app code.** No fixed bottom-left element or admin avatar exists anywhere in `src/`. It is the Next.js dev-tools indicator (`next dev`, on by default — `next.config.ts` has no `devIndicators`). Fix: screenshot a prod build, or set `devIndicators: false`. Flag back to the designer. |
| 2 | ZIP progress reads `0 од 0` | **Confirmed, root cause found.** `ensureExportJob` returns `null` unless uploads are frozen (`src/lib/export-jobs.ts:112`), but the admin *Преузми све* bar is live pre-freeze — the endpoint answers `202 {packing, 0, 0}` forever (`src/lib/export-endpoint.ts:26`, `src/app/export-download.tsx:93`). ETA and **Откажи припрему** are missing end-to-end (no button, no cancel route, no cancel state; `upload-eta.ts` exists but is unused here). |
| 3 | No way into select mode on 11a | **Confirmed, worse than reported.** Admin has **no select mode at all** — not even long-press (`admin-photo-grid.tsx:136` is onClick-only). On 8a select mode exists but long-press is the only entry. No "Изабери" / "Или дуго притисните…" strings exist in `dictionaries.ts`. |
| 4 | Native date input in freeze block | **Confirmed.** `<input type="date">` + `<input type="number">` at `src/app/admin/freeze-toggle.tsx:96-119`: 9px radius (spec 14), `bg-sand` (spec ivory raised `#fffdf8`), ~30px tall (spec 44), OS calendar chrome in system font. |
| 5 | `Приватна` badge bottom-left, oversized | **Half-confirmed.** Size/padding/color are correct (10px, 3×7px); position is bottom-left on both grids (spec: top-left) — `admin-photo-grid.tsx:153`, `my-photos/profile-view.tsx:478` (which also drifts to `0.7` opacity + stray tracking; two divergent copies of one badge). |
| 6 | 10a lacks private-photos toggle | **Confirmed missing.** Row is a read-only count (`admin/download-row.tsx:43`); the sheet renderer can't hold a control; no Укључи/Изостави strings; backend always packs private photos into the admin ZIP and the manifest is frozen at job creation. |
| 7 | Button says `Преузми ZIP` not `Припреми ZIP` | **Confirmed.** `dictionaries.ts:314` (+ EN `:50`); one string fixes admin and guest sheets both. |

---

## 2. Never implemented

### Upload flow
- **5d failure-details sheet — nothing exists.** No component, no copy (none of: `види које`, `Можемо да пробамо поново`, `Веза је прекинута`, `Сервер није одговорио`, `Превелика датотека`, `Није фотографија`, `Одбаци`), and no data model to feed it: failures are bare `File[]` with no reason/thumbnail/size (`upload-button.tsx:274`). Only one error class exists (`FileTooLargeError` vs everything); "not an image" is never classified (server accepts any content type, `api/uploads/route.ts:40`).
- **5c summary card after small batches.** Only the bulk path sets a summary (`upload-button.tsx:755`); a 1–10 batch ends silently. Card also lacks the outlined **Одбаци** and its failure line is inert text, not a tappable `▸ види које` (`upload-minibar.tsx:76`).
- **Failed-tile reason on the tile (5a)** — tile shows only `↺ Пробај поново` (`upload-tile.tsx:69`); no `reason` field on `UploadTile`. **Изостави on unretryable tiles** — too-large tiles are destroyed instead of relabelled (`upload-button.tsx:490`).
- **Duplicate-upload detection** (REVIEW §3, "needs decision") — no client hashing, no skip line.

### Gallery
- **"Нове фотографије ↑" pill** — no component, no string; other guests' photos merge silently into the list on tab refocus (`use-full-gallery.ts:81`).
- **6c large-gallery navigation — the whole screen.** No back-to-top button, no scrub rail (no sort-key bubble, no like-band percentiles, no drag placeholder mode). No tracker issue covers it either.
- **Sort-toggle ≥10-likes gate** — toggle shows whenever photo count > 0 (`gallery-header.tsx:287`, `guest-bar.tsx:88`); no album-wide like total is computed anywhere (one-line derivation once `useFullGallery` completes).
- **Per-sort scroll memory** — `changeSort` only scrolls to 0 (`gallery-view.tsx:142`); nothing stores/restores position per sort.

### Profile / admin / ZIP
- **Изабери pill + long-press hint on 8a, 11a, 11d** (see §1.3); admin select mode entirely.
- **8a `Преузми своје фотографије`** — no download control on the profile; `DownloadAllButton` mounts only on the frozen main gallery.
- **11d `Преузми све од овог госта · ZIP →`** — settings block has two rows, not three; no per-uploader export kind (`ExportKind = "public" | "admin"`).
- **10b ETA + Откажи припрему; 10a private toggle** (see §1).
- **10c `линк важи до 03.09.` + 7-day validity** — no expiry line rendered (`export-download.tsx:208`), signed URL is 24h re-minted per request so the stable link never expires, and nothing ever purges the ZIP.
- **Recovery code** (REVIEW §4, "needs decision") — identity is device-cookie-only; clearing storage permanently orphans a guest's photos.

### Motion
- **Avatar arrival (4a) extras:** no `av-ring` gold pulse, burst is 5 flecks ×2 not 8 sparks on a 4s `burst-cycle`, no `hint-nudge`/`hint-arrow` coach-mark nudge, sort toggle not dimmed to 28% behind the mark. (Build matches old README 12a, not ALIGN 4a.)
- **Brand mark (1a):** no burst sparks on entrance, and no play-once-per-load guard — entrance replays on every wordmark remount.
- **Intro sheet keyboard affordances:** no Enter Име→Презиме / Презиме→submit (implicit form submission fires submit from Име — the opposite), no `inputMode`/`autoCapitalize`.

---

## 3. Drift — implemented, but differs

### Viewer (7a)
- **Up-swipe dismisses** — spec is down-only (`use-swipe-dismiss.ts:107`; commit c0cb028 went directly against REVIEW §1). Thresholds 90px/0.45px·ms⁻¹ vs spec 110/0.5; shrink to 0.85 vs 0.88; backdrop fades to 0 with no 0.3 floor; axis lock at 6px vs ~10px.
- **No shared-element zoom** — generic fade+scale in/out; View Transitions API used only for locale switch and admin tabs, never photo→viewer; swipe-dismiss flings the photo off-screen instead of zooming back to the tile.
- **No zoom gating** — the viewer has no photo zoom at all (double-tap is bound to like), so "vertical drag pans when zoomed" can't hold under browser pinch-zoom.

### My photos (8b)
- Select bar matches the **old** README, not v3: no quiet `2 / 12` in the top row; `Изабери све` is a plain top-row text button, not a checkbox chip in the action bar; deselect label `Одзначи све` vs spec `Опозови избор` (`profile-view.tsx:369-388`).

### Upload / offline
- **Offline banner is the pink v2 design**: `bg-warning-bg #f7e9e3` + brown-orange `#8a4b2c` text (`offline-notice.tsx:32`) vs v3 "ivory banner, red `!`, red words, no pink surface".
- Intro sheet rest state: heading block sits inside the scroller, not pinned (`intro-sheet.tsx:158-179`); compact state is correct.
- Small-batch failures never join a batch-level retry set (`retryBulkFailures` covers bulk only).

### Feed
- **`tile-in` replays on every virtualization remount** (`photo-grid.tsx:416`) — continuous fade-on-scroll, which REVIEW §1 explicitly forbids.
- **40ms page stagger is dead code** — `enterOrder` computed in `use-photo-feed.ts:68` but read by no one.
- **Pulsing skeletons** in `grid-skeleton.tsx:24`, `my-photos/loading.tsx:34`, `admin/skeleton.tsx` — spec: flat `#f1eadb`, no shimmer (color right, pulse wrong).
- Unliked pill renders 36px wide, not a 34px circle (`px-2.5` + 16px icon; the spec's own numbers produce this — needs a call).

### Header / brand
- **Mark entrance uses `fleck-fall` 0.9s** (old README) vs ALIGN/board `av-pop` 0.5s + `burst` sparks 0.85s.
- Animated mark inside the 10b packing card (`export-download.tsx:153`) — spec: static outside the header.
- Wordmark and guest-bar back-link tap boxes ~28–31px vs 44px minimum (admin back link does it right — pattern not applied).

### Admin / ZIP
- 11d filter chips are full route navigations (through `loading.tsx`) while 11a filters client-side — same control, inconsistent behavior; 11d also loads all of a guest's photos unpaged.
- Cosmetic: 10a sheet scrim without the blurred backdrop; `Испразни корпу` carries an underline; off-vocabulary radii (8/9/10/18px) on a few inputs/bars.

### Muted-text & size floor (global decision needed)
ALIGN §0 says ≥ `rgba(43,38,32,0.55)`, nothing under 12px — but the board itself is built on 11px eyebrows/meta and 0.45 opacities, and the code follows the board: wordmark `ink/45` 11px, empty-state footnote `ink/45`, intro-sheet labels `ink/45–50`, admin rows `ink/50`, ~10 sites of 11px meta, 10px badges. One global ruling beats 12 local fixes.

---

## 4. Deliberate divergences / spec-doc lag (not bugs)

- **No infinite scroll**: whole-gallery handover + virtualized grid (ADR 0002, 0006) replaces the spec's ~30/page IntersectionObserver. Corollaries: no bottom loading indicator; "load pages up to the viewer's photo" is moot. The handoff docs were never updated.
- **Per-guest gallery entry points**: tile label links to `/uploader/[publicId]` (issue 22 decision) vs DIFF's "viewer pill is the only entry".
- **Own-photo viewer caption** stays plain italic instead of the uploader pill (deliberate, commented).
- **6b totals block**: ALIGN's "31 / 12 / 47" misreads its own board (those are like counts on mock tiles); code matches the board.
- **9a masthead**: ALIGN says "same masthead treatment", DIFF says "no ceremonial masthead" — code follows DIFF.

---

## 5. What matches (compressed)

Tokens hex-exact, Cormorant+Jost loaded (Geist gone), contrast rule applied, danger words-only. Masthead/compact bar to the pixel incl. measured sticky offsets and the 140px/220ms fade. Upload-window line with real freeze-date derivation. Empty and frozen states. Intro sheet: after-pick, no autofocus, two states, visualViewport sizing. 5a optimistic tiles (ring, %, per-tile ✕, Отказано·Врати, visible-only-when-complete). 5b bulk mini-bar (counter, ETA, current thumbnail, wake lock with re-acquire, refresh every 10). Offline queue mechanics + "чека" tiles. Like pill geometry/optimism/bounce, uploader label per DIFF §2. Sort semantics + legacy params + instant scroll-to-top + upload→Најновије. Viewer chrome, caption pill per DIFF §4, history model (one entry, `?photo=`, replaceState, back-closes, shareable), last-photo-seen return via column geometry. Per-guest gallery per DIFF §3. Admin chrome/tabs (no avatar), 11a/11b/11c rows and pills, `uploads_blocked` end-to-end with server 403. ZIP genuinely server-side, resumable, self-rechaining, no link before ready, state restored on return. 13a dead-link screen with desaturated mark. 14c rejected-photo card.

---

## 6. Unverified (needs device / board render)

- EN regression at 390px (compact bar one line; "Save and upload 4 photos" at 16px).
- Intro-sheet compact threshold (560px) firing on the reported Android device.
- Mini-bar stickiness on iOS Safari (`sticky` + `mt-auto`, not `fixed`).
- Reduced-motion settled state of the mark; Jost 300 actually rendering; backdrop-blur fallbacks.
- Pixel-diff of paddings/geometry against the board (agents matched markdown specs, not a render).

---

## Unresolved questions

1. Text floor: enforce 12px/0.55 (ALIGN §0) or accept board's 11px/0.45? One global call.
2. Up-swipe dismiss was built deliberately (c0cb028) — revert to down-only per spec?
3. Unliked pill: force 34px circle or keep spec-derived 36px?
4. Duplicate detection + recovery code — REVIEW says "needs decision"; decide or wontfix?
5. Update handoff/spec docs for the ADR'd divergences (virtualization, tile-label links)?
6. Confirm §1.1 with one prod-build screenshot before telling the designer it's the dev indicator?
