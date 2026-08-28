alter table event_settings
  add column event_date date not null default '2026-09-20',
  add column freeze_offset_days int not null default 7
    check (freeze_offset_days >= 0);
