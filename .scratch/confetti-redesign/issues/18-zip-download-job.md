# 18 — Download-all ZIP (13a–13c)

**What to build:** Two canonical server-built ZIPs, created once when uploads freeze:
`exports/public.zip` (all public photos — the guest download) and `exports/admin.zip`
(public + private). No per-requester and no per-guest zips. Guests reach the public zip
from the frozen gallery (1b); admin reaches theirs from 9a.

**Blocked by:** 15 (admin entry); supersedes MVP issue 15-bulk-export

**Status:** done

Lifecycle:
- [ ] Uploads freeze 7 days after the event date (cron; hardcoded date from issue 03) —
      the existing manual admin toggle remains as an override
- [ ] Freeze fires both zip builds; no rebuild on later gallery changes (post-freeze
      deletions/hides are not re-packed)
- [ ] Zip layout per MVP issue 15: folder per uploader display name, filenames prefixed
      with taken-timestamp; store-only (no compression)
- [ ] Job table row per zip: state `packing|ready|failed`, progress N of M; build runs
      chunked/resumable if one invocation can't finish (S3 multipart to Supabase Storage)

Stable-link flow (no rotting URLs):
- [ ] Zip objects are permanent files in a private bucket
- [ ] `GET /api/export/public` (open) and `GET /api/export/admin` (admin session): if job
      `ready` → mint fresh ~24h signed URL → 302; if `packing` → "preparing" state, never 404
- [ ] "Копирај линк" copies the stable endpoint URL, never the signed URL
- [ ] Admin zip only reachable behind admin session

UI:
- [ ] 13a sheet: summary rows (count · оригинали · size); guests see no "Приватне" row;
      admin sheet is informational (both zips always build — no Укључи/Изостави toggle)
- [ ] 13b running card (6b geometry) with progress, re-hydrates from job row across visits
- [ ] 13c ready card: "ZIP је спреман · size", "Преузми сада" + "Копирај линк"; drop the
      "линк важи до" line — the stable link does not expire

## Comments

Final model (2026-08-27): bulk download only after freeze; exactly two zips (public /
admin); built once at freeze, never re-zipped on subsequent changes; per-guest zip export
removed; links distributed as stable endpoints that 302 to fresh signed URLs per click.
