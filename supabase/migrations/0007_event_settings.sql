-- Single-row table for event-wide toggles.
create table event_settings (
  id smallint primary key check (id = 1),
  uploads_frozen boolean not null default false
);

insert into event_settings (id) values (1);

-- All access goes through the server with the service role; deny anon/authenticated.
alter table event_settings enable row level security;
