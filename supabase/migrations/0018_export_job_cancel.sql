-- A packing job the admin cancels keeps its row so status probes see the
-- cancellation instead of resurrecting the build; a later prepare replaces it.
-- job_id changes on every (re)creation: progress writes are conditioned on it,
-- so a worker slice from a superseded job cannot touch the new one.
-- snapshot_frozen records whether uploads were frozen when the manifest was
-- taken; the freeze replaces any job whose snapshot predates it.
alter table export_jobs
  drop constraint export_jobs_state_check,
  add constraint export_jobs_state_check
    check (state in ('packing', 'ready', 'failed', 'cancelled')),
  add column job_id uuid not null default gen_random_uuid(),
  add column snapshot_frozen boolean not null default true;
