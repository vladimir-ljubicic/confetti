-- Photo count and like total per uploader, for the uploaders on one page of
-- tiles: the pills on screen need a handful of counts, not a roll-up of the
-- whole table.
drop function public_uploader_photo_counts();

create function public_uploader_stats(uploader_ids uuid[])
returns table (uploader_id uuid, photo_count bigint, like_total bigint)
language sql
stable
as $$
  select p.uploader_id, count(*), coalesce(sum(p.like_count), 0)
  from photos p
  where p.visibility = 'public'
    and p.uploaded_at is not null
    and p.deleted_at is null
    and p.uploader_id = any(uploader_ids)
  group by p.uploader_id;
$$;

-- Every number the admin header, filter chips, guest list and download row
-- show, so those pages never read photo rows to count them.
create function admin_gallery_summary()
returns jsonb
language sql
stable
as $$
  with live as (
    select uploader_id, visibility, size_bytes
    from photos
    where uploaded_at is not null and deleted_at is null
  ),
  per_uploader as (
    select
      l.uploader_id,
      count(*) as photos,
      count(*) filter (where l.visibility = 'private') as privates
    from live l
    group by l.uploader_id
  )
  select jsonb_build_object(
    'total_count', (select count(*) from live),
    'private_count', (select count(*) from live where visibility = 'private'),
    'bin_count', (select count(*) from photos where deleted_at is not null),
    'total_bytes', (select coalesce(sum(size_bytes), 0) from live),
    'uploaders', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'public_id', u.public_id,
          'display_name', u.display_name,
          'photo_count', p.photos,
          'private_count', p.privates
        )),
        '[]'::jsonb
      )
      from per_uploader p
      left join uploaders u on u.id = p.uploader_id
    )
  );
$$;

-- All access goes through the server with the service role.
revoke execute on function public_uploader_stats(uuid[]) from anon, authenticated;
revoke execute on function admin_gallery_summary() from anon, authenticated;

-- Keyset pagination walks one uploader's photos in the same key order as the
-- gallery at large, so those orders get an index led by the uploader.
create index photos_uploader_latest_idx
  on photos (uploader_id, uploaded_at desc, id desc)
  where uploaded_at is not null and deleted_at is null;

create index photos_public_uploader_popular_idx
  on photos (uploader_id, like_count desc, uploaded_at desc, id desc)
  where visibility = 'public' and uploaded_at is not null and deleted_at is null;

-- The admin gallery pages over public and private photos alike, on a key that
-- ends on the id like every other paginated order.
drop index photos_gallery_idx;

create index photos_latest_idx on photos (uploaded_at desc, id desc)
  where uploaded_at is not null and deleted_at is null;
