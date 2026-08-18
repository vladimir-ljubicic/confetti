# Confetti — Jelena & Vladimir's Wedding Photo Share

Responsive webapp where wedding guests upload and browse photos. Guests reach it
via a QR code printed on cards at the venue. Wedding date: **2026-09-20**,
~200 guests. Photos only (no video in v1).

## Stack

- Single **Next.js** app on **Vercel** — route handlers only, no separate backend.
- **Supabase**: Postgres + Storage. Free tier during development; **Pro plan
  before launch** (image transforms require it).
- Uploads go **browser → Supabase Storage directly** via signed URLs using
  **resumable (TUS) uploads**. Vercel never touches file bytes (its 4.5MB
  request-body cap does not apply). Originals are stored untouched.
- Gallery images are always served through Supabase **image transforms**
  (JPEG/WebP out), never raw object URLs — raw HEIC does not render in
  Chrome/Firefox. Transform source limit is 25MB; files above it fall back to a
  client-generated thumbnail made at upload time.
- A helper builds image URLs; an env flag switches between transform URLs
  (Pro) and original URLs (dev on free tier).

## Identity — no login

- Each device gets a random **device token** (cookie/localStorage) on first
  visit. The token owns: uploaded photos, the visibility default, display name.
- **Display name is mandatory, free text**, asked once in the first-upload
  dialog. Names are attribution labels, not access control.
- Lost token (new phone, cleared data) = guest can no longer self-manage old
  uploads. Backstop: admins can edit visibility/name on any photo.

## Upload flow

- First upload → dialog: display name + public/private **default**.
- Every later upload is **one tap** using the stored default. No per-batch
  visibility choice.
- Multi-select from the photo library; HEIC accepted as-is (iOS usually
  delivers JPEG anyway).

## Gallery

- Public photos visible and **downloadable (originals, EXIF intact)** by anyone
  with the URL. No embargo, no passcode.
- Two sort modes with a manual toggle:
  - **Live feed** (upload time) — default until the wedding day ends
  - **Chronological** (EXIF taken time, fallback upload time) — default after
- **Per-uploader public pages**: tapping an uploader's name shows their public
  photos.
- **My photos** page (device-token scoped): guest sees all own uploads incl.
  private, toggles per-photo visibility, changes their default, deletes own
  photos.
- Deletes are **soft** with a 30-day recycle bin, visible to admins.
- UI is **Serbian-first with an English toggle**.

## Visibility

- `public`: everyone.
- `private`: uploader (via My photos) + admins only.

## Admin (bride & groom)

- Shared passcode (env var) entered at `/admin` → long-lived signed cookie.
- Powers:
  - See all photos incl. private, with uploader name on each; filter/group by
    uploader; per-uploader counts.
  - Delete any photo; edit any photo's visibility; edit uploader names.
  - **Freeze/unfreeze uploads** (toggle, no fixed date).
  - **Bulk export**: one zip of originals incl. private, folder per uploader
    name, filenames prefixed with taken-timestamp.
- Admins are exempt from rate limits.

## Rate limits (all env-configurable)

- 50 photos per batch
- 100 uploads / 15 min / device
- 60MB per file
- No total cap per device.

## Design

- App name: **Confetti**. Displayed title: **"Jelena & Vladimir"**.
- Palette: **gold** primary with **ivory/pearl** off-white.

## Lifecycle

- Gallery stays up **~6 months** after the wedding.
- Uploads end whenever admins freeze them.

## Deferred decisions

- **Custom domain** — must be final the day before QR cards go to print
  (≥2 weeks away). Until then the app runs on `*.vercel.app`. QR code (PNG/SVG)
  is generated from the final URL.
- **Supabase Pro upgrade** — ~1 week before the wedding, to test the transform
  pipeline.

## Future consideration: video

Storage and the TUS upload path support video as-is (paid tier raises the 50MB
file cap). Gaps: poster thumbnails (client-side canvas capture at upload),
HEVC playback compatibility, bandwidth cost; proper transcoding would require
external infra (e.g. Mux / Cloudflare Stream). The media model keeps a type
column so basic video support is a feature, not a redesign.
