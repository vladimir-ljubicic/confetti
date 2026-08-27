-- One canonical ZIP per kind, built once when uploads freeze; the manifest
-- snapshots the gallery at freeze time so later changes never alter the zip.
create table export_jobs (
  kind text primary key check (kind in ('public', 'admin')),
  state text not null default 'packing'
    check (state in ('packing', 'ready', 'failed')),
  total_count integer not null,
  done_count integer not null default 0,
  zip_size_bytes bigint not null,
  storage_path text not null,
  manifest jsonb not null,
  crcs jsonb not null default '[]',
  upload_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- All access goes through the server with the service role; deny anon/authenticated.
alter table export_jobs enable row level security;

-- Zips are served through server-minted signed URLs only.
insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do update set public = false;
