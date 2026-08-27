alter table photos add column like_count integer not null default 0;

-- device_id is the guest's device identity (uploaders.id shares the same
-- uuid space, but a guest can like before ever having an uploader row).
create table likes (
  photo_id uuid not null references photos (id) on delete cascade,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (photo_id, device_id)
);

create index likes_device_idx on likes (device_id);

create function sync_like_count() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update photos set like_count = like_count + 1 where id = new.photo_id;
    return new;
  else
    update photos set like_count = greatest(like_count - 1, 0) where id = old.photo_id;
    return old;
  end if;
end;
$$;

create trigger likes_sync_count
  after insert or delete on likes
  for each row execute function sync_like_count();

-- All access goes through the server with the service role; deny anon/authenticated.
alter table likes enable row level security;
