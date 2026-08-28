-- Keyset pagination walks the gallery in the exact key order of each sort, so
-- both orders get an index that ends on the id tiebreaker.
create index photos_public_latest_idx on photos (uploaded_at desc, id desc)
  where visibility = 'public' and uploaded_at is not null and deleted_at is null;

create index photos_public_popular_idx
  on photos (like_count desc, uploaded_at desc, id desc)
  where visibility = 'public' and uploaded_at is not null and deleted_at is null;
