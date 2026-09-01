-- Likes across the whole public gallery, summed in the database: the gallery
-- header decides on its sort toggle before a single photo row is rendered, and
-- the first screen it does render is only a head of the gallery.
create function public_like_total()
returns bigint
language sql
stable
as $$
  select coalesce(sum(like_count), 0)
  from photos
  where visibility = 'public'
    and uploaded_at is not null
    and deleted_at is null;
$$;

-- All access goes through the server with the service role.
revoke execute on function public_like_total() from anon, authenticated;
