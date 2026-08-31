-- Photos whose renditions sit in the other bucket from the one their row
-- calls for: public live photos belong in the public renditions bucket,
-- private and deleted ones in the private photos bucket. Photos still being
-- uploaded are skipped; completing the upload settles their bucket.
create function rendition_mismatches(max_rows int)
returns table (photo_id uuid, bucket text)
language sql
stable
as $$
  with expected as (
    select p.id,
      case when p.visibility = 'public' and p.deleted_at is null
        then 'renditions' else 'photos' end as bucket
    from photos p
    where p.uploaded_at is not null
  )
  select distinct e.id, e.bucket
  from expected e
  join storage.objects o
    on o.bucket_id in ('photos', 'renditions')
   and o.name in (e.id::text || '/thumb.jpg', e.id::text || '/viewer.jpg')
  where o.bucket_id <> e.bucket
  limit max_rows;
$$;
