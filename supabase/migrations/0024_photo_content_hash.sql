-- SHA-256 of the original file, recorded when the upload is signed, so a guest
-- re-picking a photo their device already put in the gallery has it left out
-- instead of uploaded a second time.
alter table photos add column content_hash text;

create index photos_uploader_hash_idx on photos (uploader_id, content_hash)
  where content_hash is not null
    and uploaded_at is not null
    and deleted_at is null;
