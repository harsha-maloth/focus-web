-- Run with: supabase test db
-- Checks row isolation between users and the server-side session rules.
create extension if not exists pgtap with schema extensions;

begin;
select plan(19);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

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

select * from finish();
rollback;
