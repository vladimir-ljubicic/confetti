-- Recycle bin listing and the 30-day purge both scan deleted photos only.
create index photos_recycle_idx on photos (deleted_at)
  where deleted_at is not null;
