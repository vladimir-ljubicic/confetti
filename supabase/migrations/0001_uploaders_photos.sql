create table uploaders (
  id uuid primary key,
  display_name text,
  default_visibility text not null default 'public'
    check (default_visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key,
  uploader_id uuid not null references uploaders (id),
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  size_bytes bigint not null,
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  media_type text not null default 'photo',
  taken_at timestamptz,
  uploaded_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- uploaded_at is null until the client confirms the upload finished;
-- the gallery only shows rows where it is set.
create index photos_gallery_idx on photos (uploaded_at desc)
  where uploaded_at is not null and deleted_at is null;
create index photos_uploader_idx on photos (uploader_id);

-- All access goes through the server with the service role; deny anon/authenticated.
alter table uploaders enable row level security;
alter table photos enable row level security;
