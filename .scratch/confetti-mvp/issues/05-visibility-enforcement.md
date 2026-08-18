# 05 — Visibility enforcement

**What to build:** Photos marked `private` are invisible to the public: they never appear in the gallery and their originals are not reachable by guessing URLs. Public photos remain visible and downloadable by anyone with the URL.

**Blocked by:** 04 — First-upload dialog + one-tap batch uploads.

**Status:** ready-for-agent

- [x] Photo uploaded with a private default does not appear in the public gallery
- [x] Private photo's image/original URLs are not accessible without authorization
- [x] Public photos unaffected

## Comments

- Enforcement mechanism: the gallery query selects only `visibility = 'public'`
  rows; the `photos` bucket is private (codified in migration 0002), so
  originals are reachable only via server-issued signed URLs, which are only
  created for photos the viewer may see. RLS denies all anon DB/storage access.
- Verified end-to-end against the live project: private-default profile →
  upload → complete; private photo absent from gallery HTML, raw object URL
  400s, anon-key download rejected, public photo + its signed download
  unaffected.
- Caveat: signed URLs live 1h, so a photo flipped public→private (ticket 06)
  stays fetchable via an already-issued URL until it expires.
