-- Chronological sort key: EXIF taken time when the upload had it, upload time
-- otherwise. Generated so the gallery can order by a plain column.
alter table photos add column effective_taken_at timestamptz
  generated always as (coalesce(taken_at, uploaded_at)) stored;

create index photos_chrono_idx on photos (effective_taken_at)
  where uploaded_at is not null and deleted_at is null;
