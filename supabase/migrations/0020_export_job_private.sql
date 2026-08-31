-- The admin zip packs private photos only when the admin asked for them;
-- the choice is fixed when the manifest is snapshotted, like the manifest
-- itself. The public zip never holds them.
alter table export_jobs
  add column include_private boolean not null default true;

update export_jobs set include_private = false where kind = 'public';

-- private_bytes: size of the private subset, so a zip without private
-- photos can be sized.
create or replace function admin_gallery_summary()
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
    'private_bytes',
      (select coalesce(sum(size_bytes), 0) from live where visibility = 'private'),
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
