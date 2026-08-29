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

**Per-guest gallery**:
A guest's public photos only — the same set for every viewer, including the guest themselves and the admin.

**Uploader label**:
The "First L." name shown on gallery tiles, linking to that guest's per-guest gallery.

**Uploader pill**:
The tappable avatar+name control in the photo viewer that opens the per-guest gallery, showing the guest's public photo count.
