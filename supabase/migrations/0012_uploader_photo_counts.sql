-- Public photo count per uploader, grouped in the database so the gallery
-- render fetches one row per uploader instead of every photo row.
create function public_uploader_photo_counts()
returns table (uploader_id uuid, photo_count bigint)
language sql
stable
as $$
  select uploader_id, count(*)
  from photos
  where visibility = 'public'
    and uploaded_at is not null
    and deleted_at is null
  group by uploader_id;
$$;

-- All access goes through the server with the service role.
revoke execute on function public_uploader_photo_counts() from anon, authenticated;
