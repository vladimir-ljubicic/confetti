# ADR-0008: A recovery code carries a guest's identity between devices

## Status

Accepted. Resolves the open question in
`.scratch/confetti-redesign/issues/59-recovery-code.md`.

## Context

A guest is their device cookie. `uploaders.id` is the uuid that cookie holds,
`photos.uploader_id` references it and `likes.device_id` shares its space, so
the cookie is not a pointer to an identity — it is the identity, and it
authorizes every edit made in that identity's name.

That makes the cookie a single point of loss. Clearing browser data, switching
phones, or opening the event link in a second browser leaves a guest unable to
hide, publish, delete or download their own photos, with their name still on
every tile. Nothing in the app could give it back: the admin can manage any
photo, but the guest cannot reach their own again.

## Decision

Every uploader record carries a six-character recovery code, minted from the
CSPRNG when the record is created and unchanged by every later profile save.
The guest is shown it on their own page; redeeming it on another device is
what re-links them.

Redemption rewrites the device cookie to the recovered uploader id. There is
no new identity concept and no linking table — the recovered device simply
becomes that guest, which is what the cookie already meant.

A device that had already introduced itself is folded into the recovered
identity rather than left behind: its photos change hands, its likes move
across (a photo both identities liked keeps one, and the trigger takes the
other off the count) and its now-empty uploader row goes. Its own zip goes
with it, object and all: the photos it packed have changed hands, so it
snapshots a gallery that is no longer its own. Merging and counting share one
transaction in `redeem_recovery_code`, so a redemption cannot half-happen.

The alphabet is Crockford base32 — no I, L, O or U — so a code read off a
screen and typed on another phone cannot be misread and cannot spell a word.
Redemption reads I and L back as 1 and O as 0, and ignores case and the
separator the code is shown with.

## Consequences

- The hole is closed for the guest who still has the code, which is the guest
  who was told to save it. One who saved nothing is exactly where they were,
  and the admin remains their only way to have a photo hidden or removed.
- A code is a bearer credential: whoever types it becomes that guest, with
  their private photos and their own zip. Six characters is 32^6 ≈ 1.07e9, and
  a wedding-sized album puts a couple of hundred codes in it, so a blind guess
  lands about twice in ten million. Wrong guesses are counted per device in
  `recovery_attempts` and capped at 8 per 15 minutes, which leaves brute force
  needing a cookie rotation per attempt for odds that stay negligible. The
  code is not a password and is not treated as one — it is shown in the clear
  on the guest's own page, where the device already holds the identity.
- Attempt rows outside the window are dropped whenever the function runs,
  whoever left them, so the table stays the size of one window's traffic and
  needs no purge of its own.
- `save_uploader_profile` writes the code on insert only, so a guest editing
  their profile never finds the code they wrote down has changed. A collision
  on the unique index is retried with a fresh code.
- Two devices can hold the same identity at once — a guest who recovers on a
  new phone and picks the old one back up. Both are that guest, which is the
  honest answer; nothing in the app assumes one device per uploader.
- The device that redeems keeps no trace of what it was. A guest who recovers
  onto a phone that was mid-batch loses nothing already uploaded, since those
  photos move with the merge.
