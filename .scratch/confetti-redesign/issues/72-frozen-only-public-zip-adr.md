# 72 — Record why the public ZIP builds only once, at the freeze

**What to build:** An ADR stating that the public gallery ZIP is prepared only once
uploads are frozen and built once per snapshot, with the alternative considered — a
shared ZIP refreshed at most once a day while uploads are open — and why it was set
aside. The reason is what a rebuild costs on Supabase Storage, and the record must say
so: it is a property of the storage service, not a flaw in the export design.

**Status:** done

- [x] `docs/adr/0009-frozen-only-public-zip.md` — Accepted
- [x] Names the two Supabase Storage properties a refresh runs into: every build reads
      the whole gallery back out (billed egress), and an object cannot be extended in
      place, so an incremental build reads as much as a full one
- [x] Notes that a mid-window ZIP also invites a second download per guest, which is
      the larger egress line
- [x] Upload window stays at the default seven days after the event date; no code change

## Comments

Decided 2026-09-10 after weighing option 1 (daily shared snapshot). Storage size was
never the concern: the ZIP replaces the same object path, so there is one object
whichever way it is built.
