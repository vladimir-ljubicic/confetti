-- Uploader ids double as device tokens (they authorize edits), so pages that
-- appear in shareable URLs identify uploaders by this separate public id.
alter table uploaders add column public_id uuid not null unique
  default gen_random_uuid();
