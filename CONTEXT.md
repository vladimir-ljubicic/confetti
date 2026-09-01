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
One photo a batch could not put in the gallery, kept with its preview, its reason, how far it got and how many attempts it has cost. It stays in the list until the guest retries it into the gallery, leaves it out, or discards the lot. The failure sheet identifies each one by its thumbnail, never a filename, and groups them by whether they are retryable. A failure from a small batch still holds the tile the photo occupies in the grid: it retries in place and leaves the grid when the guest leaves it out. A failure from a large batch has no tile, so the summary card's retry starts a fresh batch for it.

**Retry in the sheet**:
Retrying from the failure sheet — one row, or the whole retryable group a few at a time — sends the photo without starting a batch. The failure survives the attempt, so its row keeps its place while it sends and carries its history if it fails again; only a photo that made it leaves, and the shrinking list is the whole progress indicator.

**Dead-end failure**:
A retryable failure that has cost three attempts. It drops into its own group below the retryable ones, where the way out on offer is to leave it out rather than to try a fourth time. Retrying the group never counts or touches it.

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

**Sort gate**:
The like floor under which the sort toggle is not offered at all. Below ten likes across the photos an order would rearrange, latest and popular come out all but the same, so the control would read as broken. The whole gallery's total gates the gallery header; one guest's own total gates their gallery.

**Sort scroll memory**:
Where the guest was standing in each order, kept for as long as the gallery stays loaded. Switching orders lands instantly at the place they left the one they enter, and at its top the first time — the same distance down latest and popular is not the same photos. The ways in that mean the top of the latest order — the wordmark home and a fresh upload — forget it instead, and it is dropped whole whenever the orders stop holding the same photos: narrowing to a guest's gallery, widening back, or letting in the photos the new photos pill announced.

**Brand mark entrance**:
The mark's one celebration per app load: its five flecks spring in on a stagger while five sparks fly out of the middle and fade, after which the flecks settle into the slow sway they keep for as long as the page lives. It runs on the load's own clock rather than on each mark's arrival, so the stand-in header handing over to the loaded one carries one entrance across the swap, and a mark that comes up after it is over — a header remounting on a navigation — comes up mid-sway with the celebration behind it. A guest who asks for reduced motion gets the mark standing still.

**Avatar arrival**:
The header's welcome to a guest who has just introduced themselves: the avatar pops in under a gold ring that goes on pulsing, with eight confetti sparks that burst outward once every four seconds, and a coach mark points at it, nudging itself every few seconds until the guest dismisses it, scrolls away, or it times out. The sort toggle behind the mark dims while it is up, so the overlap reads as deliberate rather than as a collision. It is offered once per device, and a guest who asks for reduced motion gets the avatar and the mark standing still.

**New photos pill**:
The glass pill announcing other guests' photos that arrived after the gallery was loaded. They stay out of the grid until the guest taps it, which admits them and brings the top of the gallery on screen. The guest's own photos never wait behind it.

**Back to top**:
The round ↑ in the bottom-left corner of the gallery, within thumb reach and across the screen from the centred upload pill so the two never meet. It arrives once the guest is two screens down and leaves again within half a screen of the top, and it lands at the top at once rather than scrolling there.

**Scrub rail**:
The way through a gallery too long to flick: a thin rail down its right edge, mounted only above three hundred photos, invisible until something scrolls and gone again a moment after it stops. Dragging its thumb moves the gallery by the fraction of the rail the thumb has travelled, and a bubble beside the thumb states where that lands in the terms the list is ordered by — the day and time of day in latest, the like band in popular, never a date, since every photo is from the same wedding. What the drag flies past stays flat on its tile; only the photos the finger comes to rest on are fetched.

**Like band**:
The company a photo's likes put it in — the album's dearest tenth, and the two bands beneath it — drawn at the like counts the album's own distribution falls on rather than at numbers fixed in advance, and left out when the album cannot fill it. What the scrub rail states in the popular order. The bands stop where the album's likes do: a photo nobody has liked is said to have none rather than put in a band, and one under every band is said only to have been liked.

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

**Viewer dismiss**:
The drag that closes the full-screen viewer, upwards or downwards alike: past 110px, or a shorter flick faster than 0.5px·ms⁻¹. The photo shrinks to 0.88 as it goes and the stage thins to 0.3 without ever clearing, so the gallery underneath stays a hint. A sideways lead belongs to the track's own scroll instead. The release hands the photo to the photo zoom.

**Photo zoom**:
The travel of one photo between its gallery tile and the viewer's stage, in both directions, as a single picture moving rather than one appearing over another. It leaves from the tile the guest tapped and returns to the tile of the last photo they saw, wherever swiping through the viewer left them, while the gallery around it dissolves into the dark stage. The tile stands empty for as long as the stage holds its photo: one photo is in one place. Where a browser cannot run it the viewer fades in and out instead, and the dismiss drag flings the photo off screen.

**Export target**:
Whose photos a ZIP holds. Two are shared, packed once for everyone: the public gallery, and the admin's — public photos, plus private ones when the admin asks for them. The third is a guest's own, every photo their device uploaded and private ones with it; there is one of those per guest, and both that guest and the couple reach it — the guest from their own page, the couple from that guest's admin page.

**Export job**:
The server-side packing of one ZIP per export target. Preparing it starts the job or restarts a cancelled or expired one; it packs until ready, and every ZIP but the public one can be cancelled while it packs. The public ZIP can only be prepared once frozen; the admin's and a guest's own at any time. The freeze replaces a shared ZIP whose snapshot was taken while uploads were open and leaves a guest's own alone — theirs exists only once they ask for it. The private-photos choice is part of the snapshot: preparing with the other choice replaces the live admin ZIP.

**Link validity**:
The week a ready ZIP stays downloadable, counted from the moment it became ready; the ready card states the last day. Past it the job is expired: the stable link answers 410, the nightly purge removes the ZIP object, and the ZIP has to be prepared again.

**Revocation window**:
The short delay (up to about a minute) between a photo becoming private or deleted and its thumbnail ceasing to load for other guests. Guests who already viewed the photo may retain it regardless.
