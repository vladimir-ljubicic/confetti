# Confetti

Wedding photo-sharing gallery: guests upload photos via an event link, browse and like each other's photos, and download the full gallery after uploads close.

## Language

**Guest**:
A person who opened the event link and can upload photos and like others'. The code's persistence term is `uploader`.
_Avoid_: User, visitor

**Photo visibility**:
A photo is either public (shown in galleries) or private (visible only to its owner and the admin).

**Upload window**:
The period during which guests can add photos, ending at the freeze moment.

**Failure reason**:
Why one photo did not go up, in the guest's words: the connection broke (network), the server did not answer (server), the file is over the size limit (too-large), or it is not a photo at all (not-an-image).

**Retryable failure**:
A failure another attempt could fix — network and server. The other two are the file's own doing, so the guest leaves them out instead of retrying.

**Batch failure**:
One photo a batch could not put in the gallery, kept with its preview, its reason and how far it got. It stays in the list until the guest retries it, leaves it out, or discards the lot. The failure sheet identifies each one by its thumbnail, never a filename, and groups them by whether they are retryable. A failure from a small batch still holds the tile the photo occupies in the grid: it retries in place and leaves the grid when the guest leaves it out. A failure from a large batch has no tile, so retrying it starts a fresh batch.

**Batch summary**:
The one card that closes a batch, large or small: how many photos went up, a tappable line stating how many did not, and the two ways out — retry every retryable failure, or discard the lot. It dismisses itself.

**Freeze moment**:
Midnight (Europe/Belgrade) after event date + freeze offset days. When it passes, uploads freeze automatically.

**Frozen**:
The state in which uploads are closed. Freezing is one-way and automatic; reopening is a deliberate admin act that requires both unfreezing and extending the upload window.

**Event date**:
The wedding day, stored in settings and configurable by the admin; the anchor for the freeze moment and all displayed dates.

**Latest**:
Sort mode: newest uploads first. Always the default.
_Avoid_: Live, Уживо

**Popular**:
Sort mode: most-liked first, ties broken newest-first.
_Avoid_: Chronological, Хронолошки, oldest-first

**New photos pill**:
The glass pill announcing other guests' photos that arrived after the gallery was loaded. They stay out of the grid until the guest taps it, which admits them and brings the top of the gallery on screen. The guest's own photos never wait behind it.

**Select mode**:
A grid state, entered by long-pressing a tile or the Изабери pill, in which taps pick photos and a pinned action bar hides, publishes or deletes the picks. "Select all" covers the photos the active filter shows; the top row counts picks against the whole album.

**Selection scope**:
Whose photos a bulk action may reach: a guest's own (their device) or, for the admin, every guest's.

**Per-guest gallery**:
A guest's public photos only — the same set for every viewer, including the guest themselves and the admin.

**Uploader label**:
The "First L." name shown on gallery tiles, linking to that guest's per-guest gallery.

**Uploader pill**:
The tappable avatar+name control in the photo viewer that opens the per-guest gallery, showing the guest's public photo count.

**Thumbnail**:
The small rendition of a photo that gallery tiles render, produced on the guest's device during upload.

**Viewer image**:
The larger rendition the full-screen viewer shows once it loads; the thumbnail stands in until then, and remains when no viewer image exists.

**Export job**:
The server-side packing of one ZIP per kind (public gallery, or admin: public photos, plus private ones when the admin asks for them). Preparing it starts the job or restarts a cancelled or expired one; it packs until ready, and the admin can cancel it while it packs. The public ZIP can only be prepared once frozen; the admin ZIP at any time, and the freeze replaces a ZIP whose snapshot was taken while uploads were open. The private-photos choice is part of the snapshot: preparing with the other choice replaces the live admin ZIP.

**Link validity**:
The week a ready ZIP stays downloadable, counted from the moment it became ready; the ready card states the last day. Past it the job is expired: the stable link answers 410, the nightly purge removes the ZIP object, and the ZIP has to be prepared again.

**Revocation window**:
The short delay (up to about a minute) between a photo becoming private or deleted and its thumbnail ceasing to load for other guests. Guests who already viewed the photo may retain it regardless.
