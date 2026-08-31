# 32 — Private-photos toggle in the admin download sheet (10a)

**What to build:** `Приватне · Укључи / Изостави` — the couple choose whether private
photos go into the ZIP. ALIGN §1.6.

**Status:** ready-for-human

- [x] Segmented control in the Приватне row of the admin sheet — today it is a read-only
      count (`src/app/admin/download-row.tsx:43`) and `ExportSheet` rows can only render
      label/value pairs (`src/app/export-download.tsx:281`)
- [x] Strings both locales (no include/exclude labels exist)
- [x] Backend: the choice must exist before the job row is created — `snapshotPhotos`
      branches only on kind and the manifest freezes at creation
      (`src/lib/export-jobs.ts:75`, `:112`)
- [x] Guest sheet unchanged (row already omitted, `src/app/download-all-button.tsx:39`)

Refs: ALIGN §1.6, §2 10a.

## Comments

Implemented. Notes for the reviewer:
- Choice stored as `export_jobs.include_private`; migration `0020` applied. Public job stores `false`.
- POST `/api/export/admin` takes `{ includePrivate }`; a live admin job with the other choice is replaced (a ready ZIP link goes with it).
- Sheet count/size follow the toggle: the live job's snapshot when the toggle matches its choice (Prepare hands that job back), otherwise the DB summary (`private_bytes` added to `admin_gallery_summary`).
- Segmented control extracted to `src/app/segmented.tsx` and reused by the freeze block.
