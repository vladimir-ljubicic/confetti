# Confetti redesign — spec

**Source of truth:** `docs/design/design_handoff_confetti_redesign/README.md` (+ `Gallery Directions.dc.html`,
open in a browser; screen ids like `1a`, `6b` match the README). The README is high-fidelity:
colors, type sizes, spacing, radii and copy are final — match exact hex/px values it gives.
Do **not** copy markup from the `.dc.html` file; recreate in the existing Next.js + Tailwind
codebase using its component patterns, `src/lib/dictionaries.ts`, and the existing upload layer.

## Scope

Full visual/UX redesign of the guest gallery plus new capabilities:

- Shrink-on-scroll masthead + compact bar, ceremonial typography, `<ConfettiMark>` brand mark
- Per-photo likes (one per guest, optimistic)
- Optimistic upload experience (tiles ≤10 files, mini-bar >10, wake lock, incremental refresh)
- Dark photo viewer with swipe (7a)
- Guest profile page with select mode (8a)
- Tabbed admin area (9a–9d) incl. per-guest upload block
- Server-side download-all ZIP job (13a–13c)
- Error states: dead link (14a), offline queue (14b), rejected photo (14c)

## What already exists (restyle, not rebuild)

Gallery grid (`src/app/photo-grid.tsx`), sort toggle, locale toggle, upload button,
first-upload dialog, my-photos page, admin page + bin + freeze toggle + rename,
recycle bin + purge, upload freeze, rate limits.

## New server-side state (needs migrations)

- `likes` (photo × guest, unique) + `like_count` on photos
- `uploads_blocked` per uploader (9d Забрани)
- ZIP job table with progress + 7-day signed URL

Already present: `deleted_at` (bin), `display_name` (rename), `uploads_frozen` (event_settings).

## Core semantics (from README, binding)

- Sort: Уживо = newest first (default); Хронолошки = oldest first; same order drives viewer swiping.
- Like: one per guest per photo, optimistic toggle, tied to the same local guest identity as the name.
- Private photo: visible only to uploader + admin; hide/unhide is reversible.
- Обриши → admin bin, restorable 30 days, then purge. Guests never see the bin.
- Intro sheet (4a) only on first upload, **after** file picking.
- Photo visible to others only once fully uploaded.
- ZIP packs server-side, survives page close, no link offered before the ZIP exists.

## Implementation order (README's five passes)

1. Tokens + brand mark + header/masthead — issues 01–03
2. Feed — issues 04–07
3. Upload rework — issues 08–11
4. Viewer + profile — issues 12–14
5. Admin + ZIP + dead link — issues 15–19; English regression 20

## Decisions

- Fonts: Jost + Cormorant Garamond (drop Geist).
- Couple names/date: hardcoded.
- Admin auth: existing login/session kept; README's `?k=` link ignored.
- Likes: keyed on device identity; unnamed guests can like.
- ZIP: uploads auto-freeze 7 days after the event; exactly two zips built once at freeze
  (`public.zip` for guests, `admin.zip` = public + private), never rebuilt on later
  changes; per-guest zip export dropped; links = stable app endpoints that 302 to fresh
  short-TTL signed URLs per click (admin endpoint behind admin session).
