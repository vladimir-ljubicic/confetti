# ADR-0009: The public ZIP is built once, at the freeze

## Status

Accepted. Recorded in
`.scratch/confetti-redesign/issues/72-frozen-only-public-zip-adr.md`.

## Context

The public gallery ZIP is a shared export target: one object, packed once, that
every guest downloads. The build worker reads every photo out of the photos
bucket, packs it on the way through and writes the archive to the exports
bucket at a fixed path, replacing whatever was there.

Guests can add photos until the freeze moment, seven days after the event date
by default. Between the wedding and the freeze the gallery is browsable but the
ZIP is not on offer, and the question was whether a ZIP refreshed while uploads
are still open — shared, rebuilt at most once a day — would be worth having.

Two properties of Supabase Storage set the price of a refresh:

- **Every build reads the whole gallery.** Bytes leaving the photos bucket are
  billed egress. A daily refresh over a seven-day window reads the gallery out
  up to eight times instead of once; on a Pro project the plan's included
  egress absorbs a small gallery, and a large one pays per gigabyte past it.
- **An object cannot be extended in place.** There is no range append or
  server-side concatenation, so adding the day's photos to yesterday's ZIP
  means reading yesterday's ZIP back out and writing a new one. An incremental
  build reads as much as a full one.

Storage size is not affected either way: the ZIP replaces the same object, so
there is one archive whichever way it is built.

A ZIP available mid-window also invites a second download: a guest who takes
it on day three takes the final one on day seven. Downloads by guests are the
dominant egress line already, so that doubling outweighs the builds.

## Decision

The public ZIP can be prepared only once uploads are frozen. It is built once
per snapshot; the freeze replaces a shared ZIP whose snapshot was taken while
uploads were open. The upload window keeps its default of seven days after the
event date, configurable by the admin as before.

## Consequences

- One full read of the gallery per public ZIP. Build egress is a fixed,
  one-off cost rather than one that grows with the window.
- Guests wait for the freeze to download; browsing and liking are unaffected.
- Should a mid-window ZIP become worth offering, the bounded shape is a shared
  snapshot built on demand and only when the manifest has changed since the
  last one, never one archive per request. The storage properties above are
  what make every other shape cost more than it returns.
