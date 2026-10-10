-- Run with: supabase test db
-- Checks row isolation between users and the server-side session rules.
create extension if not exists pgtap with schema extensions;

begin;
select plan(53);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@example.com');

-- New-user trigger -----------------------------------------------------------
select is(
  (select count(*)::int from public.profiles
    where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2, 'a profile row is created for each new user');

select is(
  (select count(*)::int from public.user_settings
    where user_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2, 'a settings row is created for each new user');

-- Act as user A ----------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.tags (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Study');
select is((select count(*)::int from public.tags), 1, 'A sees their own tag');

select throws_ok(
  $$update public.profiles set timezone = 'Mars/Base' where id = '11111111-1111-1111-1111-111111111111'$$,
  '22023', null, 'unknown timezones are rejected');

select throws_ok(
  $$insert into public.focus_sessions (user_id, planned_seconds)
    values ('11111111-1111-1111-1111-111111111111', 1500)$$,
  '42501', null, 'clients cannot insert sessions directly');

select lives_ok($$select public.start_session(null, 1500)$$, 'A can start a session');

select throws_ok($$select public.start_session(null, 1500)$$,
  '55000', 'a session is already running', 'a second running session is refused');

select throws_ok(
  $$select public.end_session((select id from public.focus_sessions where status = 'running'), 'completed')$$,
  '22023', 'session has not reached its planned length', 'completing early is refused');

select set_config('app.sid', (select id::text from public.focus_sessions where status = 'running'), true);

select lives_ok(
  $$select public.end_session(current_setting('app.sid')::uuid, 'abandoned')$$,
  'A can abandon the session');

select ok(
  (select focused_seconds <= 5 and status = 'abandoned'
     from public.focus_sessions where id = current_setting('app.sid')::uuid),
  'abandoned session keeps only the real elapsed time');

select lives_ok($$select public.start_session(null, 600)$$, 'A can start another session');
select set_config('app.sid', (select id::text from public.focus_sessions where status = 'running'), true);

select lives_ok(
  $$select public.log_session_event(current_setting('app.sid')::uuid, 'blur')$$,
  'a blur event can be logged');

select is(
  (select distraction_count from public.focus_sessions where id = current_setting('app.sid')::uuid),
  1, 'a blur event raises the distraction count');

-- Stale sessions earn nothing -------------------------------------------------
reset role;
update public.focus_sessions set started_at = now() - interval '2 hours'
 where id = current_setting('app.sid')::uuid;
set local role authenticated;

select lives_ok($$select public.start_session(null, 600)$$,
  'a stale running session no longer blocks a new one');

select ok(
  (select status = 'abandoned' and focused_seconds = 0
     from public.focus_sessions where id = current_setting('app.sid')::uuid),
  'a stale session is abandoned with zero focused time');

-- Timezone flag ------------------------------------------------------------------
select is(
  (select timezone_confirmed from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'),
  false, 'timezone starts unconfirmed');

select lives_ok(
  $$update public.profiles set timezone_confirmed = true
     where id = '11111111-1111-1111-1111-111111111111'$$,
  'a user can confirm their own timezone');

-- Stats and milestones ----------------------------------------------------------
select is(jsonb_array_length(public.my_stats() -> 'daily'), 30, 'stats cover the last 30 days');

select is((public.my_stats() ->> 'current_streak')::int, 0,
  'abandoned sessions do not make a streak');

select lives_ok($$select public.award_milestones()$$, 'milestones can be awarded');

select throws_ok(
  $$insert into public.milestones (user_id, type, value)
    values ('11111111-1111-1111-1111-111111111111', 'sessions', 1)$$,
  '42501', null, 'clients cannot insert milestones directly');

-- Presence and away time ---------------------------------------------------------
-- now() is frozen inside a test transaction, so time is moved by editing rows as
-- the table owner, then switching back to the signed-in role.
select set_config('app.sid', (select id::text from public.focus_sessions where status = 'running'), true);

reset role;
update public.focus_sessions
   set started_at = now() - interval '10 minutes', last_seen_at = now() - interval '30 seconds'
 where id = current_setting('app.sid')::uuid;
set local role authenticated;

select lives_ok($$select public.session_heartbeat(current_setting('app.sid')::uuid)$$,
  'a heartbeat is accepted');

select is(
  (select present_seconds from public.focus_sessions where id = current_setting('app.sid')::uuid),
  30, 'a heartbeat adds the time since the last one');

reset role;
update public.focus_sessions set last_seen_at = now() - interval '5 minutes'
 where id = current_setting('app.sid')::uuid;
set local role authenticated;

select lives_ok($$select public.session_heartbeat(current_setting('app.sid')::uuid)$$,
  'a heartbeat after a long silence is accepted');

select is(
  (select present_seconds from public.focus_sessions where id = current_setting('app.sid')::uuid),
  30, 'a long silence adds no presence time');

reset role;
update public.focus_sessions set present_seconds = 600, last_seen_at = now()
 where id = current_setting('app.sid')::uuid;
set local role authenticated;

select is(
  (public.end_session(current_setting('app.sid')::uuid, 'completed')).status::text,
  'completed', 'a session with full presence completes');

select is(
  (select focused_seconds from public.focus_sessions where id = current_setting('app.sid')::uuid),
  600, 'and keeps its full time');

-- Timer ran out but nobody was verifiably there.
select lives_ok($$select public.start_session(null, 600)$$, 'another session can start');
select set_config('app.sid', (select id::text from public.focus_sessions where status = 'running'), true);

reset role;
update public.focus_sessions
   set started_at = now() - interval '10 minutes', present_seconds = 100,
       last_seen_at = now() - interval '200 seconds'
 where id = current_setting('app.sid')::uuid;
set local role authenticated;

select is(
  (public.end_session(current_setting('app.sid')::uuid, 'completed')).status::text,
  'abandoned', 'a session without enough presence is not completed');

select is(
  (select focused_seconds from public.focus_sessions where id = current_setting('app.sid')::uuid),
  100, 'only the verified time counts');

-- Two minutes on another tab.
select lives_ok($$select public.start_session(null, 600)$$, 'a third session can start');
select set_config('app.sid', (select id::text from public.focus_sessions where status = 'running'), true);

reset role;
update public.focus_sessions
   set started_at = now() - interval '10 minutes', present_seconds = 600, last_seen_at = now()
 where id = current_setting('app.sid')::uuid;
insert into public.session_events (session_id, user_id, type, at) values
  (current_setting('app.sid')::uuid, '11111111-1111-1111-1111-111111111111', 'blur',  now() - interval '8 minutes'),
  (current_setting('app.sid')::uuid, '11111111-1111-1111-1111-111111111111', 'focus', now() - interval '6 minutes');
set local role authenticated;

select is(
  (public.end_session(current_setting('app.sid')::uuid, 'completed')).status::text,
  'completed', 'a session with a short absence still completes');

select is(
  (select focused_seconds from public.focus_sessions where id = current_setting('app.sid')::uuid),
  480, 'time spent away from the tab is not counted as focused');

-- A stale session whose heartbeats covered it keeps its time.
select lives_ok($$select public.start_session(null, 600)$$, 'a fourth session can start');
select set_config('app.sid', (select id::text from public.focus_sessions where status = 'running'), true);

reset role;
update public.focus_sessions set started_at = now() - interval '2 hours', present_seconds = 600
 where id = current_setting('app.sid')::uuid;
set local role authenticated;

select lives_ok($$select public.start_session(null, 600)$$,
  'a stale session with proven presence does not block a new one');

select ok(
  (select status = 'completed' and focused_seconds = 600
     from public.focus_sessions where id = current_setting('app.sid')::uuid),
  'a stale session keeps the time that was verified');

-- A running session of A's for the isolation checks below.
select set_config('app.sid', (select id::text from public.focus_sessions where status = 'running'), true);

-- Time zone list ------------------------------------------------------------------
select ok((select count(*) from public.timezone_names()) > 100,
  'the server lists the time zones it accepts');

select ok(
  (select count(*) from public.timezone_names() as tz(name) where tz.name = 'UTC') = 1
  and not exists (select 1 from public.timezone_names() as tz(name) where tz.name like 'posix/%'),
  'the list has UTC and no posix/ duplicates');

-- Stats on known data (user C) -----------------------------------------------------
-- Completed on days -1, -2, -3 and -5 (a gap at -4), ended early today.
reset role;
insert into public.tags (id, user_id, name) values ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Study');
insert into public.focus_sessions
  (user_id, tag_id, started_at, planned_seconds, ended_at, status, focused_seconds)
select 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, v.tag, s.ts, 1800, s.ts + interval '30 minutes', v.st::public.session_status, v.secs
  from (values (1, 'cccccccc-0000-0000-0000-000000000001'::uuid, 'completed', 1800),
               (2, null::uuid,  'completed', 1800),
               (3, null::uuid,  'completed', 1800),
               (5, null::uuid,  'completed', 1800),
               (0, null::uuid,  'abandoned',  600)) as v(d, tag, st, secs)
 cross join lateral (
   select ((now() at time zone 'UTC')::date - v.d + time '12:00') at time zone 'UTC' as ts
 ) s;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);

select is((public.my_stats() ->> 'current_streak')::int, 3,
  'a streak counts consecutive days with a completed session');
select is((public.my_stats() ->> 'longest_streak')::int, 3,
  'the longest streak ignores the older, shorter run');
select is((public.my_stats() ->> 'active_today')::boolean, false,
  'an ended-early session does not make today active');
select is((public.my_stats() ->> 'today_seconds')::int, 600,
  'ended-early time still counts toward today');
select is((public.my_stats() ->> 'total_seconds')::int, 7800, 'totals add up');
select is((public.my_stats() ->> 'completed_sessions')::int, 4, 'completed sessions are counted');
select is((public.my_stats() -> 'tags' -> 0 ->> 'seconds')::int, 6000,
  'untagged time is grouped on its own, largest first');
select is(public.my_stats() -> 'tags' -> 1 ->> 'name', 'Study', 'tagged time is grouped by tag');

select lives_ok($$select public.award_milestones()$$, 'milestones are awarded');
select is(jsonb_array_length(public.my_stats() -> 'milestones'), 3,
  'a session, an hour and a 3-day streak are awarded');
select lives_ok($$select public.award_milestones()$$, 'awarding twice is harmless');
select is(jsonb_array_length(public.my_stats() -> 'milestones'), 3, 'and does not duplicate');

-- Act as user B ----------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.focus_sessions where id = current_setting('app.sid')::uuid) +
  (select count(*)::int from public.tags),
  0, 'B cannot see A''s sessions or tags');

select throws_ok(
  $$select public.end_session(current_setting('app.sid')::uuid, 'abandoned')$$,
  'P0002', 'session not found', 'B cannot end A''s session');

select throws_ok(
  $$select public.session_heartbeat(current_setting('app.sid')::uuid)$$,
  'P0002', 'no running session with that id', 'B cannot send a heartbeat for A''s session');

select * from finish();
rollback;
