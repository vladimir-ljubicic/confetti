-- A public bucket would expose every original at a guessable URL; all reads
-- go through server-issued signed URLs.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;
