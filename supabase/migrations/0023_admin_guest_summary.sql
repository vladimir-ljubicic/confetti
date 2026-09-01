-- Every number one guest's admin page shows — its heading, its filter chips and
-- its download row — so the page reads a page of photo rows rather than all of
-- that guest's.
create function admin_guest_summary(uploader_id uuid)
returns jsonb
language sql
stable
as $$
  with live as (
    select visibility, like_count, size_bytes
    from photos
    where photos.uploader_id = admin_guest_summary.uploader_id
      and uploaded_at is not null
      and deleted_at is null
  )
  select jsonb_build_object(
    'photo_count', (select count(*) from live),
    'public_count', (select count(*) from live where visibility = 'public'),
    'like_total', (select coalesce(sum(like_count), 0) from live),
    'total_bytes', (select coalesce(sum(size_bytes), 0) from live)
  );
$$;

-- All access goes through the server with the service role.
revoke execute on function admin_guest_summary(uuid) from anon, authenticated;
