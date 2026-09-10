# 52 — "Преузми своје фотографије" on 8a

**What to build:** A guest downloads their own photos from the profile. No download
control exists there; `DownloadAllButton` mounts only on the frozen main gallery
(`gallery-screen.tsx:151`).

**Status:** wontfix

- [ ] Outlined button under the grid on 8a, both locales
- [ ] Opens the 10a sheet scoped to the guest's own photos (public + their private);
      copy notes whose photos are in scope
- [ ] Own-photos export kind — `ExportKind` is `"public" | "admin"` today
      (`export-jobs.ts:23`); shares plumbing with issue 53

Refs: ALIGN §2 8a, 10a; README 8a.

## Comments

Shipped in c8a30fc, then removed under issue 71: the uploader already holds these
photos on their device. The couple's per-guest ZIP (issue 53) is the surviving use of
the uploader export target.
