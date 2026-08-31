-- A ready zip is downloadable for a limited time: expires_at is set when the
-- job becomes ready. The nightly purge removes the zip object once the
-- deadline has passed and marks the job expired; a later prepare replaces it.
alter table export_jobs
  drop constraint export_jobs_state_check,
  add constraint export_jobs_state_check
    check (state in ('packing', 'ready', 'failed', 'cancelled', 'expired')),
  add column expires_at timestamptz;

update export_jobs
set expires_at = updated_at + interval '7 days'
where state = 'ready' and expires_at is null;
