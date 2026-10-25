-- ============================================================
-- Hüküm Yolu — Supabase şeması
-- ============================================================
-- Güvenlik modeli:
--   * rooms, room_players, room_state: RLS açık, istemci politikası YOK.
--     Bu tablolara yalnızca service_role yetkili Edge Function erişir.
--   * room_versions: yalnızca oda kimliği, sürüm, durum ve zaman içerir.
--     Realtime aboneliği için anon/authenticated tarafından okunabilir.
--   * Oyuncu sırları düz metin değil, SHA-256 özeti olarak saklanır.
--   * Oyun durumu yalnızca Edge Function içinde okunur ve redakte edilir.
--
-- Bu dosyayı Supabase SQL Editor'a yapıştırabilir veya
-- `supabase db push` ile uygulayabilirsiniz.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Odalar
-- ------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null,
  status text not null default 'lobby'
    check (status in ('lobby', 'playing', 'finished')),
  version bigint not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_code_format
    check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$')
);

-- ------------------------------------------------------------
-- Odadaki oyuncular
-- ------------------------------------------------------------
create table if not exists public.room_players (
  id uuid primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  avatar_id text not null,
  -- İnsan oyuncular için SHA-256(playerSecret); botlar için null.
  secret_hash text,
  is_host boolean not null default false,
  is_bot boolean not null default false,
  ready boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  constraint room_players_name_length
    check (char_length(name) between 3 and 16),
  constraint room_players_avatar_format
    check (avatar_id ~ '^avatar-([1-9]|1[0-6])$'),
  constraint room_players_secret_shape
    check (
      (is_bot and secret_hash is null)
      or ((not is_bot) and secret_hash is not null)
    )
);

create index if not exists room_players_room_id_idx
  on public.room_players (room_id);

create index if not exists room_players_room_last_seen_idx
  on public.room_players (room_id, last_seen desc);

-- Bir odada en fazla bir host. Host devri önce false, sonra true
-- şeklinde iki ayrı UPDATE ile yapılır; kısmi index bunu destekler.
create unique index if not exists room_players_one_host_idx
  on public.room_players (room_id)
  where is_host;

-- ------------------------------------------------------------
-- Tam oyun durumu (yalnızca Edge Function erişir)
-- ------------------------------------------------------------
create table if not exists public.room_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Herkese açık sürüm işareti (Realtime sinyali)
-- Bu tabloda rol, deste, oy veya oyuncu sırrı YOKTUR.
-- ------------------------------------------------------------
create table if not exists public.room_versions (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  version bigint not null default 1,
  status text not null default 'lobby'
    check (status in ('lobby', 'playing', 'finished')),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_state enable row level security;
alter table public.room_versions enable row level security;

-- Hassas tablolarda istemci politikası yoktur. RLS açık + politika yok
-- = anon/authenticated için varsayılan red. service_role RLS'yi atlar.

drop policy if exists "room_versions_public_read" on public.room_versions;
create policy "room_versions_public_read"
  on public.room_versions
  for select
  to anon, authenticated
  using (true);

-- Realtime: yalnızca room_versions yayınlanır. İstemci bu tabloyu
-- dinleyip asıl durumu Edge Function üzerinden yeniden çeker.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_versions'
  ) then
    alter publication supabase_realtime add table public.room_versions;
  end if;
end
$$;

-- ------------------------------------------------------------
-- Lobi değişikliklerinde sürümü artır + Realtime'ı tetikle
-- ------------------------------------------------------------
create or replace function public.bump_room_version(
  p_room_id uuid,
  p_status text default null
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_version bigint;
  v_status text;
begin
  update public.rooms
     set version = version + 1,
         status = coalesce(p_status, status),
         updated_at = now()
   where id = p_room_id
  returning version, status into v_new_version, v_status;

  if v_new_version is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.room_versions (room_id, version, status, updated_at)
  values (p_room_id, v_new_version, v_status, now())
  on conflict (room_id) do update
    set version = excluded.version,
        status = excluded.status,
        updated_at = excluded.updated_at;

  return v_new_version;
end;
$$;

-- ------------------------------------------------------------
-- Lobide oyuncu/bot ekleme: oda satırını kilitle, kapasiteyi kontrol et,
-- oyuncuyu ekle ve sürümü aynı transaction içinde artır.
-- Bu sayede eşzamanlı katılımlar 10 oyuncu sınırını aşamaz.
-- ------------------------------------------------------------
create or replace function public.add_room_member(
  p_room_id uuid,
  p_player_id uuid,
  p_name text,
  p_avatar_id text,
  p_secret_hash text,
  p_is_bot boolean,
  p_ready boolean,
  p_is_host boolean,
  p_max_players integer default 10
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
  v_count integer;
  v_new_version bigint;
begin
  select status into v_status
    from public.rooms
   where id = p_room_id
   for update;

  if v_status is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_status <> 'lobby' then
    raise exception 'ROOM_NOT_LOBBY' using errcode = '22023';
  end if;

  select count(*) into v_count
    from public.room_players
   where room_id = p_room_id;

  if v_count >= p_max_players then
    raise exception 'ROOM_FULL' using errcode = '22023';
  end if;

  insert into public.room_players (
    id, room_id, name, avatar_id, secret_hash,
    is_host, is_bot, ready, connected, joined_at, last_seen
  )
  values (
    p_player_id, p_room_id, p_name, p_avatar_id, p_secret_hash,
    p_is_host, p_is_bot, p_ready, true, clock_timestamp(), clock_timestamp()
  );

  update public.rooms
     set version = version + 1,
         updated_at = now()
   where id = p_room_id
  returning version into v_new_version;

  insert into public.room_versions (room_id, version, status, updated_at)
  values (p_room_id, v_new_version, v_status, now())
  on conflict (room_id) do update
    set version = excluded.version,
        status = excluded.status,
        updated_at = excluded.updated_at;

  return v_new_version;
end;
$$;

-- ------------------------------------------------------------
-- Oyun durumunu iyimser sürüm kontrolüyle atomik yaz
-- Aynı transaction içinde rooms, room_state ve room_versions güncellenir.
-- ------------------------------------------------------------
create or replace function public.commit_room_state(
  p_room_id uuid,
  p_expected_version bigint,
  p_state jsonb,
  p_status text
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_version bigint;
begin
  if p_status is null or p_status not in ('playing', 'finished') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;

  update public.rooms
     set version = version + 1,
         status = p_status,
         updated_at = now()
   where id = p_room_id
     and version = p_expected_version
  returning version into v_new_version;

  if v_new_version is null then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;

  insert into public.room_state (room_id, state, updated_at)
  values (p_room_id, p_state, now())
  on conflict (room_id) do update
    set state = excluded.state,
        updated_at = excluded.updated_at;

  insert into public.room_versions (room_id, version, status, updated_at)
  values (p_room_id, v_new_version, p_status, now())
  on conflict (room_id) do update
    set version = excluded.version,
        status = excluded.status,
        updated_at = excluded.updated_at;

  return v_new_version;
end;
$$;

-- Bu fonksiyonlar yalnızca service_role tarafından çağrılabilir.
revoke all on function public.bump_room_version(uuid, text)
  from public, anon, authenticated;
revoke all on function public.add_room_member(
  uuid, uuid, text, text, text, boolean, boolean, boolean, integer
) from public, anon, authenticated;
revoke all on function public.commit_room_state(uuid, bigint, jsonb, text)
  from public, anon, authenticated;

grant execute on function public.bump_room_version(uuid, text)
  to service_role;
grant execute on function public.add_room_member(
  uuid, uuid, text, text, text, boolean, boolean, boolean, integer
) to service_role;
grant execute on function public.commit_room_state(uuid, bigint, jsonb, text)
  to service_role;
