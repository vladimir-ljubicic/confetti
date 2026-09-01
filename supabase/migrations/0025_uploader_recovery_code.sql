-- A guest's identity is their device cookie, so a cleared browser or a new
-- phone would otherwise orphan their photos for good. The recovery code is the
-- one thing they can carry across: redeeming it hands the new device the old
-- identity and folds whatever the new one had already gathered into it.
alter table uploaders add column recovery_code text unique;

-- Crockford base32, drawn from the CSPRNG a byte at a time; 256 is a whole
-- number of alphabets, so the remainder favours no character.
do $$
declare
  uploader_id uuid;
  candidate text;
begin
  for uploader_id in select id from uploaders where recovery_code is null loop
    loop
      select string_agg(
        substr(
          '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
          1 + (get_byte(gen_random_bytes(1), 0) % 32),
          1
        ),
        ''
      )
      into candidate
      from generate_series(1, 6);
      exit when not exists (select 1 from uploaders u where u.recovery_code = candidate);
    end loop;
    update uploaders u set recovery_code = candidate where u.id = uploader_id;
  end loop;
end;
$$;

alter table uploaders alter column recovery_code set not null;

-- Saving a profile must not disturb the code the guest has already written
-- down, so the code is written on the way in and left alone after.
create function save_uploader_profile(
  device_id uuid,
  display_name text,
  default_visibility text,
  recovery_code text
) returns text
language sql
volatile
as $$
  insert into uploaders (id, display_name, default_visibility, recovery_code)
  values (
    save_uploader_profile.device_id,
    save_uploader_profile.display_name,
    save_uploader_profile.default_visibility,
    save_uploader_profile.recovery_code
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        default_visibility = excluded.default_visibility
  returning uploaders.recovery_code;
$$;

-- A code is a bearer credential, so wrong guesses are counted per device and
-- capped. Rows outside the window are dropped on the way past, whoever left
-- them, which is the whole of the table's housekeeping.
create table recovery_attempts (
  device_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index recovery_attempts_device_idx on recovery_attempts (device_id);
create index recovery_attempts_age_idx on recovery_attempts (attempted_at);

alter table recovery_attempts enable row level security;

-- Returns one of three outcomes: 'ok' with the recovered identity and the path
-- of any zip the merge discarded, 'unknown' for a code nobody holds, or
-- 'rate-limited'. The merge and the counting share a transaction so a
-- redemption cannot half-happen.
create function redeem_recovery_code(code text, device_id uuid) returns jsonb
language plpgsql
volatile
as $$
declare
  max_attempts constant integer := 8;
  window_minutes constant integer := 15;
  recent integer;
  target uploaders%rowtype;
  discarded_zip text;
begin
  delete from recovery_attempts a
  where a.attempted_at < now() - make_interval(mins => window_minutes);

  select count(*) into recent
  from recovery_attempts a
  where a.device_id = redeem_recovery_code.device_id;

  if recent >= max_attempts then
    return jsonb_build_object('outcome', 'rate-limited');
  end if;

  select * into target
  from uploaders u
  where u.recovery_code = redeem_recovery_code.code;

  if not found then
    insert into recovery_attempts (device_id) values (redeem_recovery_code.device_id);
    return jsonb_build_object('outcome', 'unknown');
  end if;

  if target.id <> redeem_recovery_code.device_id then
    update photos p
    set uploader_id = target.id
    where p.uploader_id = redeem_recovery_code.device_id;

    -- A photo both identities liked keeps one like, and the trigger takes the
    -- other off its count.
    delete from likes l
    where l.device_id = redeem_recovery_code.device_id
      and exists (
        select 1 from likes k where k.photo_id = l.photo_id and k.device_id = target.id
      );

    update likes l
    set device_id = target.id
    where l.device_id = redeem_recovery_code.device_id;

    -- Its photos have changed hands, so the zip it packed of them snapshots a
    -- gallery that is no longer its own. The caller removes the object the
    -- returned path names.
    delete from export_jobs e
    where e.uploader_id = redeem_recovery_code.device_id
    returning e.storage_path into discarded_zip;

    delete from uploaders u where u.id = redeem_recovery_code.device_id;
  end if;

  delete from recovery_attempts a where a.device_id = redeem_recovery_code.device_id;

  return jsonb_build_object(
    'outcome', 'ok',
    'uploader_id', target.id,
    'display_name', target.display_name,
    'discarded_zip_path', discarded_zip
  );
end;
$$;

-- All access goes through the server with the service role.
revoke execute on function save_uploader_profile(uuid, text, text, text) from anon, authenticated;
revoke execute on function redeem_recovery_code(text, uuid) from anon, authenticated;
