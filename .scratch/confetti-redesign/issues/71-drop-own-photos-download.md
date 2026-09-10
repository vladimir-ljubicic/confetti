# 71 — Drop "Преузми своје фотографије" from the guest's page

**What to build:** Remove the guest's own-photos ZIP from 8a. The uploader already
holds every one of those photos on the device that uploaded them, so a download of
them back to that same device serves nothing. The couple's per-guest ZIP on the admin
guest page (issue 53) stays; it shares the uploader export target.

**Status:** done

- [x] Outlined button, sheet and job card gone from `/my-photos`
- [x] `/api/export/mine` and its cancel route gone; the admin per-guest routes stay
- [x] `myPhotos.download` / `downloadIntro` strings gone, both locales
- [x] Uploader ZIP saves as `fotografije-gosta.zip`, since only the couple download it
- [x] `CONTEXT.md` export target/job entries and ADR-0008 no longer describe a guest
      reaching their own ZIP

Refs: issue 52 (reversed), issue 53.

## Comments

The `uploader` export kind, `export_jobs.uploader_id` (migration 0022) and the
per-target job logic stay: the admin's per-guest ZIP is built on them. Jobs and
objects guests already prepared remain valid for the admin route.
