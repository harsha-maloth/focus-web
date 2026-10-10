-- 0002_tz_confirmed_and_stale_sessions.sql
--
-- 1. profiles.timezone_confirmed: new accounts start on UTC and the app sets the
--    browser's zone once. Without a flag, anyone who deliberately chose UTC was
--    overwritten on every load.
-- 2. start_session: a session left running past its planned end used to be closed
--    as "completed" with full credit, so start + close tab earned free time.
--    Nothing proves the time was spent (there is no heartbeat yet), so it is now
--    closed as "abandoned" with zero focused time.

-- ---------------------------------------------------------------- timezone flag

alter table public.profiles
  add column timezone_confirmed boolean not null default false;

-- Anyone already off the UTC default has a zone that was set on purpose or by the app.
update public.profiles set timezone_confirmed = true where timezone <> 'UTC';

grant update (timezone_confirmed) on public.profiles to authenticated;

-- ---------------------------------------------------------------- start_session

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
  -- is closed so it does not block a new one. No proof the time was spent, so it
  -- earns nothing: abandoned, zero focused seconds.
  update public.focus_sessions
     set status = 'abandoned',
         ended_at = started_at + make_interval(secs => planned_seconds),
         focused_seconds = 0
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
