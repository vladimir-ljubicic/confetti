-- Public photos' renditions serve straight from the storage CDN; paths derive
-- from the photo id (a v4 uuid), so a URL is unguessable without it. Private
-- and deleted photos' renditions live in the private photos bucket instead.
insert into storage.buckets (id, name, public)
values ('renditions', 'renditions', true)
on conflict (id) do update set public = true;
