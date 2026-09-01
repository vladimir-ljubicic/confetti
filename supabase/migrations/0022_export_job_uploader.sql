-- Zips are scoped to a target: the two shared ones (public, admin) carry no
-- uploader_id, a guest's own zip carries theirs. NULLS NOT DISTINCT so the
-- shared rows collide on kind alone, and there is one job per guest.
alter table export_jobs
  drop constraint export_jobs_pkey,
  drop constraint export_jobs_kind_check,
  add column uploader_id uuid references uploaders (id) on delete cascade,
  add constraint export_jobs_kind_check
    check (kind in ('public', 'admin', 'uploader')),
  add constraint export_jobs_uploader_check
    check ((kind = 'uploader') = (uploader_id is not null)),
  add constraint export_jobs_target_key
    unique nulls not distinct (kind, uploader_id);
