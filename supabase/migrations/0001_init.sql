-- 0001_init.sql
-- Focus web: profiles, settings, tags and focus sessions.
-- Social tables (groups, members, reactions) come in a later migration.
--
-- Rules this file enforces:
--   * Row level security is on for every table.
--   * Clients never write focus_sessions, session_events or milestones directly.
--     Sessions change only through start_session / end_session / log_session_event,
--     which use server time. This is what keeps leaderboard numbers honest.
--   * All timestamps are timestamptz (UTC). Days are computed per user timezone later.

-- ---------------------------------------------------------------- types

create type public.session_status as enum ('running', 'completed', 'abandoned');
create type public.session_source as enum ('web', 'android', 'extension');
create type public.session_event_type as enum ('blur', 'focus');
-- pause / resume are left out on purpose: a paused session needs its own
-- server-side accounting. Add the values with ALTER TYPE when that is designed.

-- ---------------------------------------------------------------- helpers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_url   text check (avatar_url is null or char_length(avatar_url) <= 500),
  timezone     text not null default 'UTC' check (char_length(timezone) <= 64),
  created_at   timestamptz not null default now()
);

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_timezone();

-- ---------------------------------------------------------------- user_settings

create table public.user_settings (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  default_minutes integer not null default 25 check (default_minutes between 1 and 240),
  break_minutes   integer not null default 5 check (break_minutes between 1 and 60),
  sound           text not null default 'none' check (char_length(sound) <= 30),
  zen             jsonb not null default '{}'::jsonb check (octet_length(zen::text) <= 4096),
  updated_at      timestamptz not null default now()
);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- tags

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 30),
  color      text not null default '#0B5563' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create or replace function public.enforce_tag_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.tags where user_id = new.user_id) >= 50 then
    raise exception 'tag limit reached (50)' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger tags_limit
  before insert on public.tags
  for each row execute function public.enforce_tag_limit();

-- ---------------------------------------------------------------- focus_sessions

create table public.focus_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  tag_id            uuid references public.tags (id) on delete set null,
  started_at        timestamptz not null default now(),
  planned_seconds   integer not null check (planned_seconds between 60 and 14400),
  ended_at          timestamptz,
  status            public.session_status not null default 'running',
  focused_seconds   integer not null default 0 check (focused_seconds >= 0),
  distraction_count integer not null default 0 check (distraction_count >= 0),
  source            public.session_source not null default 'web',
  created_at        timestamptz not null default now()
);

-- At most one running session per user.
create unique index focus_sessions_one_running_per_user
  on public.focus_sessions (user_id) where status = 'running';

create index focus_sessions_user_started
  on public.focus_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------- session_events

create table public.session_events (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.focus_sessions (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       public.session_event_type not null,
  at         timestamptz not null default now()
);

create index session_events_session on public.session_events (session_id, at);

-- ---------------------------------------------------------------- milestones

create table public.milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null check (char_length(type) <= 40),
  value       integer not null,
  achieved_at timestamptz not null default now(),
  unique (user_id, type, value)
);

-- ---------------------------------------------------------------- new user trigger

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      ''
    ),
    40
  );

  insert into public.profiles (id, display_name) values (new.id, v_name);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------- privileges
-- Start from nothing for anon, then grant only what the app needs.

revoke all on public.profiles, public.user_settings, public.tags,
              public.focus_sessions, public.session_events, public.milestones
  from anon;

-- Clients read their own rows everywhere (RLS decides which rows) but never
-- write sessions, events or milestones. They may delete their own sessions.
revoke insert, update, delete on public.focus_sessions, public.session_events, public.milestones
  from authenticated;
grant delete on public.focus_sessions to authenticated;

-- Profiles and settings rows are created by the new-user trigger; the client
-- may change only these columns.
revoke insert, update, delete on public.profiles, public.user_settings from authenticated;
grant update (display_name, avatar_url, timezone) on public.profiles to authenticated;
grant update (default_minutes, break_minutes, sound, zen) on public.user_settings to authenticated;

-- ---------------------------------------------------------------- row level security

alter table public.profiles       enable row level security;
alter table public.user_settings  enable row level security;
alter table public.tags           enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.session_events enable row level security;
alter table public.milestones     enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy settings_select_own on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy settings_update_own on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy tags_select_own on public.tags
  for select to authenticated using ((select auth.uid()) = user_id);
create policy tags_insert_own on public.tags
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tags_update_own on public.tags
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tags_delete_own on public.tags
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy sessions_select_own on public.focus_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_delete_own on public.focus_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy events_select_own on public.session_events
  for select to authenticated using ((select auth.uid()) = user_id);

create policy milestones_select_own on public.milestones
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- functions (RPC)

create or replace function public.server_time()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now(); $$;

create or replace function public.start_session(
  p_tag_id uuid default null,
  p_planned_seconds integer default 1500
)
returns public.focus_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.focus_sessions;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_planned_seconds is null or p_planned_seconds < 60 or p_planned_seconds > 14400 then
    raise exception 'planned_seconds must be between 60 and 14400' using errcode = '22023';
  end if;

  if p_tag_id is not null
     and not exists (select 1 from public.tags where id = p_tag_id and user_id = v_uid) then
    raise exception 'unknown tag' using errcode = '22023';
  end if;

  -- A session left running long past its planned end (tab closed, device off)
  -- is closed at its planned end so it does not block a new one.
  update public.focus_sessions
     set status = 'completed',
         ended_at = started_at + make_interval(secs => planned_seconds),
         focused_seconds = planned_seconds
   where user_id = v_uid
     and status = 'running'
     and now() > started_at + make_interval(secs => planned_seconds + 300);

  if exists (select 1 from public.focus_sessions where user_id = v_uid and status = 'running') then
    raise exception 'a session is already running' using errcode = '55000';
  end if;

  insert into public.focus_sessions (user_id, tag_id, planned_seconds)
  values (v_uid, p_tag_id, p_planned_seconds)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.end_session(
  p_session_id uuid,
  p_status public.session_status
)
returns public.focus_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.focus_sessions;
  v_elapsed integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_status not in ('completed', 'abandoned') then
    raise exception 'status must be completed or abandoned' using errcode = '22023';
  end if;

  select * into v_row
    from public.focus_sessions
   where id = p_session_id and user_id = v_uid
   for update;

  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'running' then
    raise exception 'session already ended' using errcode = '55000';
  end if;

  v_elapsed := greatest(0, floor(extract(epoch from (now() - v_row.started_at)))::integer);

  -- "completed" must have reached its planned length (2 s tolerance).
  -- Ending early is "abandoned" and keeps the time actually spent.
  if p_status = 'completed' and v_elapsed < v_row.planned_seconds - 2 then
    raise exception 'session has not reached its planned length' using errcode = '22023';
  end if;

  update public.focus_sessions
     set status = p_status,
         ended_at = least(now(), started_at + make_interval(secs => planned_seconds)),
         focused_seconds = least(v_elapsed, planned_seconds)
   where id = v_row.id
   returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.log_session_event(
  p_session_id uuid,
  p_type public.session_event_type
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform 1
     from public.focus_sessions
    where id = p_session_id and user_id = v_uid and status = 'running'
    for update;

  if not found then
    raise exception 'no running session with that id' using errcode = 'P0002';
  end if;

  select count(*) into v_count from public.session_events where session_id = p_session_id;
  if v_count >= 500 then
    raise exception 'too many events for this session' using errcode = '54000';
  end if;

  insert into public.session_events (session_id, user_id, type)
  values (p_session_id, v_uid, p_type);

  if p_type = 'blur' then
    update public.focus_sessions
       set distraction_count = distraction_count + 1
     where id = p_session_id;
  end if;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- Every table above cascades from auth.users.
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only signed-in users may call these.
revoke all on function public.server_time()                                       from public, anon;
revoke all on function public.start_session(uuid, integer)                        from public, anon;
revoke all on function public.end_session(uuid, public.session_status)            from public, anon;
revoke all on function public.log_session_event(uuid, public.session_event_type)  from public, anon;
revoke all on function public.delete_my_account()                                 from public, anon;

grant execute on function public.server_time()                                       to authenticated;
grant execute on function public.start_session(uuid, integer)                        to authenticated;
grant execute on function public.end_session(uuid, public.session_status)            to authenticated;
grant execute on function public.log_session_event(uuid, public.session_event_type)  to authenticated;
grant execute on function public.delete_my_account()                                 to authenticated;
