# 59 — Decision: identity recovery code

**Status:** done

REVIEW §4, flagged "needs a decision" and called "a hole rather than an enhancement".
Identity is device-cookie-only (`src/lib/device.ts`): clearing browser data or switching
phones permanently orphans a guest's uploads — no hide, no delete, name detached.

**Decision:** build. Recorded in `docs/adr/0008-recovery-code-identity.md`; the term is
defined in `CONTEXT.md`.

- [x] `recovery_code` on `uploaders`, minted from the CSPRNG in Crockford base32 and
      written on insert only, so a later profile save never changes it
- [x] Shown on `/my-photos` as a card with the "Сачувајте овај код ако мењате телефон." hint
      and a copy button
- [x] Entered from a "Већ сте отпремали?" link on 8a and from `/my-photos` when the device
      carries no identity
- [x] Redeeming rewrites the device cookie to the recovered uploader id and merges what
      the redeeming device had gathered — photos, likes, its now-empty uploader row
- [x] Wrong guesses counted per device, 8 per 15 minutes

## Comments
