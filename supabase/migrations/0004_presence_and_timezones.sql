-- 0004_presence_and_timezones.sql
--
-- 1. Presence. Until now nothing proved anyone was at the timer: a script could
--    start a session, wait, and call end_session for full credit. The page now
--    sends a heartbeat every 30 s. The server only counts a gap between two
--    heartbeats as presence if it is 90 s or less.
--      * A session is "completed" only if presence covers at least 80% of its
--        planned length. Asking for "completed" without that is recorded as
--        "abandoned" with the time that could be verified (not an error).
--      * Time spent away from the tab (blur to focus events) is no longer counted
--        as focused. The server subtracts it, so distractions now cost time.
--      * A session left running past its end (tab closed) keeps the time that was
--        verified instead of always getting zero.
--    A script can still fake heartbeats: a web page cannot prove a human is there.
--    This raises the cost of cheating, it does not remove it.
--
-- 2. Time zones. timezone_names() returns exactly the names the server accepts, so
--    the app never offers or sets a zone the profile trigger would reject.

-- ---------------------------------------------------------------- columns

alter table public.focus_sessions
  add column last_seen_at    timestamptz not null default now(),
  add column present_seconds integer     not null default 0 check (present_seconds >= 0);

-- Finished sessions from before this migration keep the time they were credited.
update public.focus_sessions
   set present_seconds = focused_seconds
 where status <> 'running';

-- ---------------------------------------------------------------- helpers
-- Internal: only the security-definer functions below call these.

-- Presence needed for a session to count as completed: 80% of its planned length.
create or replace function public.presence_required(p_planned integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select ceil(p_planned * 0.8)::integer; $$;

-- Seconds between each 'blur' event and the next event (or p_until), capped at p_until.
create or replace function public.session_away_seconds(p_session_id uuid, p_until timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
           floor(sum(extract(epoch from (least(coalesce(e.next_at, p_until), p_until) - e.at))))::integer,
           0)
    from (
      select ev.type, ev.at,
             lead(ev.at) over (order by ev.at, ev.id) as next_at
        from public.session_events ev
       where ev.session_id = p_session_id
    ) e
   where e.type = 'blur'
     and e.at < p_until;
$$;

-- Credited seconds: the span of the session, minus the larger of
--   * time with no heartbeat (unverified), and
--   * time away from the tab.
-- "Larger of", not the sum: a phone that suspends the page while you are away
-- would otherwise be penalised twice for the same minutes.
create or replace function public.session_credit(
  p_session_id uuid,
  p_span       integer,
  p_present    integer,
  p_until      timestamptz
)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(
           0,
           p_span - greatest(
                      p_span - least(p_present, p_span),
                      public.session_away_seconds(p_session_id, p_until)
                    )
         );
$$;

revoke all on function public.presence_required(integer)                         from public, anon, authenticated;
revoke all on function public.session_away_seconds(uuid, timestamptz)            from public, anon, authenticated;
revoke all on function public.session_credit(uuid, integer, integer, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------- session_heartbeat

create or replace function public.session_heartbeat(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.focus_sessions;
  v_gap numeric;
  v_add integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_row
    from public.focus_sessions
   where id = p_session_id and user_id = v_uid and status = 'running'
   for update;

  if not found then
    raise exception 'no running session with that id' using errcode = 'P0002';
  end if;

  v_gap := extract(epoch from (now() - v_row.last_seen_at));

  if v_gap <= 90 then
    -- Move last_seen_at forward by whole seconds only, so the fraction is carried
    -- to the next beat. Without this every beat would lose up to a second and an
    -- honest 25-minute session would end up credited 24:35.
    v_add := floor(v_gap)::integer;
    update public.focus_sessions
       set present_seconds = present_seconds + v_add,
           last_seen_at    = last_seen_at + make_interval(secs => v_add)
     where id = v_row.id;
  else
    -- Silence longer than 90 s: that stretch is not presence. Start over from now.
    update public.focus_sessions
       set last_seen_at = now()
     where id = v_row.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------- end_session

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
  v_uid     uuid := auth.uid();
  v_row     public.focus_sessions;
  v_elapsed integer;
  v_span    integer;
  v_gap     numeric;
  v_present integer;
  v_until   timestamptz;
  v_final   public.session_status;
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

  v_span  := least(v_elapsed, v_row.planned_seconds);
  v_until := least(now(), v_row.started_at + make_interval(secs => v_row.planned_seconds));

  -- Treat ending the session as a final heartbeat.
  v_gap     := extract(epoch from (now() - v_row.last_seen_at));
  v_present := least(
                 v_span,
                 v_row.present_seconds + case when v_gap <= 90 then floor(v_gap)::integer else 0 end
               );

  v_final := p_status;
  if p_status = 'completed'
     and v_present < public.presence_required(v_row.planned_seconds) then
    -- The timer ran out but there is not enough proof anyone was there.
    v_final := 'abandoned';
  end if;

  update public.focus_sessions
     set status          = v_final,
         ended_at        = v_until,
         present_seconds = v_present,
         last_seen_at    = now(),
         focused_seconds = public.session_credit(v_row.id, v_span, v_present, v_until)
   where id = v_row.id
   returning * into v_row;

  return v_row;
end;
$$;

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
  v_uid     uuid := auth.uid();
  v_row     public.focus_sessions;
  v_stale   public.focus_sessions;
  v_present integer;
  v_until   timestamptz;
  v_done    boolean;
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

  -- A session left running long past its planned end (tab closed, device off) is
  -- closed so it does not block a new one. It keeps only the time the heartbeats
  -- verified: completed if that reaches the presence bar, otherwise abandoned.
  select * into v_stale
    from public.focus_sessions
   where user_id = v_uid
     and status = 'running'
     and now() > started_at + make_interval(secs => planned_seconds + 300)
   for update;

  if found then
    v_present := least(v_stale.present_seconds, v_stale.planned_seconds);
    v_until   := v_stale.started_at + make_interval(secs => v_stale.planned_seconds);
    v_done    := v_present >= public.presence_required(v_stale.planned_seconds);

    update public.focus_sessions
       set status = case when v_done then 'completed'::public.session_status
                         else 'abandoned'::public.session_status end,
           ended_at = case when v_done then v_until
                           else least(v_stale.last_seen_at, v_until) end,
           present_seconds = v_present,
           focused_seconds = public.session_credit(v_stale.id, v_stale.planned_seconds, v_present, v_until)
     where id = v_stale.id;
  end if;

  if exists (select 1 from public.focus_sessions where user_id = v_uid and status = 'running') then
    raise exception 'a session is already running' using errcode = '55000';
  end if;

  insert into public.focus_sessions (user_id, tag_id, planned_seconds)
  values (v_uid, p_tag_id, p_planned_seconds)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------- timezone_names

-- Exactly what validate_timezone() accepts, minus the posix/ and right/ duplicates
-- and the legacy names (EST5EDT and friends) nobody should pick from a list.
create or replace function public.timezone_names()
returns setof text
language sql
stable
set search_path = ''
as $$
  select z.name
    from pg_catalog.pg_timezone_names z
   where z.name = 'UTC'
      or (z.name like '%/%' and z.name !~ '^(posix|right)/')
   order by z.name;
$$;

-- ---------------------------------------------------------------- privileges

revoke all on function public.session_heartbeat(uuid) from public, anon;
revoke all on function public.timezone_names()        from public, anon;

grant execute on function public.session_heartbeat(uuid) to authenticated;
grant execute on function public.timezone_names()        to authenticated;
-- end_session and start_session keep the grants they got in 0001 (create or replace
-- does not touch them).
