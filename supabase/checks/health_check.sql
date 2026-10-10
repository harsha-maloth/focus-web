select check_name,
       case when ok is null then 'info' when ok then 'PASS' else 'FAIL' end as result,
       detail
from (
  select 10 as ord, 'tables exist (6)' as check_name,
         count(*) = 6 as ok, string_agg(tablename, ', ' order by tablename) as detail
    from pg_tables
   where schemaname = 'public'
     and tablename in ('profiles','user_settings','tags','focus_sessions','session_events','milestones')
  union all
  select 11, 'row level security on for all 6 tables',
         count(*) = 6, string_agg(c.relname, ', ' order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relrowsecurity
     and c.relname in ('profiles','user_settings','tags','focus_sessions','session_events','milestones')
  union all
  select 12, 'migration 0002 column: profiles.timezone_confirmed',
         exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='profiles' and column_name='timezone_confirmed'),
         null
  union all
  select 13, 'migration 0004 columns: focus_sessions.last_seen_at, present_seconds',
         (select count(*) from information_schema.columns
           where table_schema='public' and table_name='focus_sessions'
             and column_name in ('last_seen_at','present_seconds')) = 2,
         null
  union all
  select 14, 'one running session per user (unique index)',
         exists (select 1 from pg_indexes where schemaname='public'
                  and indexname='focus_sessions_one_running_per_user'),
         null
  union all
  select 15, 'triggers present (4)',
         count(*) = 4, string_agg(t.tgname, ', ' order by t.tgname)
    from pg_trigger t
   where not t.tgisinternal
     and t.tgname in ('on_auth_user_created','tags_limit','profiles_validate_timezone','user_settings_updated_at')
  union all
  select 20, 'all 12 functions exist',
         not exists (
           select 1 from unnest(array['start_session','end_session','log_session_event','session_heartbeat',
             'server_time','timezone_names','my_stats','award_milestones','delete_my_account',
             'presence_required','session_away_seconds','session_credit']) f
            where not exists (select 1 from pg_proc p
                               where p.pronamespace = 'public'::regnamespace and p.proname = f)),
         'missing: ' || coalesce((
           select string_agg(f, ', ') from unnest(array['start_session','end_session','log_session_event',
             'session_heartbeat','server_time','timezone_names','my_stats','award_milestones',
             'delete_my_account','presence_required','session_away_seconds','session_credit']) f
            where not exists (select 1 from pg_proc p
                               where p.pronamespace = 'public'::regnamespace and p.proname = f)), 'none')
  union all
  select 21, 'end_session is the 0004 version (uses session_credit)',
         coalesce((select position('session_credit' in p.prosrc) > 0 from pg_proc p
                    where p.pronamespace = 'public'::regnamespace and p.proname = 'end_session' limit 1), false),
         null
  union all
  select 22, 'start_session is the 0004 version (closes stale sessions with verified time)',
         coalesce((select position('presence_required' in p.prosrc) > 0 from pg_proc p
                    where p.pronamespace = 'public'::regnamespace and p.proname = 'start_session' limit 1), false),
         null
  union all
  select 23, 'presence_required(1500) = 1200 (80%)',
         coalesce((select public.presence_required(1500) = 1200), false), null
  union all
  select 30, 'signed-out visitors (anon) cannot run any app function',
         not exists (select 1 from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname in ('start_session','end_session','log_session_event','session_heartbeat',
                          'server_time','timezone_names','my_stats','award_milestones','delete_my_account',
                          'presence_required','session_away_seconds','session_credit')
                        and has_function_privilege('anon', p.oid, 'execute')),
         'exposed to anon: ' || coalesce((select string_agg(p.proname, ', ') from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname in ('start_session','end_session','log_session_event','session_heartbeat',
                          'server_time','timezone_names','my_stats','award_milestones','delete_my_account',
                          'presence_required','session_away_seconds','session_credit')
                        and has_function_privilege('anon', p.oid, 'execute')), 'none')
  union all
  select 31, 'signed-in users can run the 9 app functions',
         (select count(*) from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and p.proname in ('start_session','end_session','log_session_event','session_heartbeat',
               'server_time','timezone_names','my_stats','award_milestones','delete_my_account')
             and has_function_privilege('authenticated', p.oid, 'execute')) = 9,
         null
  union all
  select 32, 'signed-in users cannot run the 3 internal helpers',
         not exists (select 1 from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname in ('presence_required','session_away_seconds','session_credit')
                        and has_function_privilege('authenticated', p.oid, 'execute')),
         null
  union all
  select 33, 'clients cannot insert or update sessions, or write events and milestones',
         not (has_table_privilege('authenticated','public.focus_sessions','INSERT')
           or has_table_privilege('authenticated','public.focus_sessions','UPDATE')
           or has_table_privilege('authenticated','public.session_events','INSERT')
           or has_table_privilege('authenticated','public.session_events','UPDATE')
           or has_table_privilege('authenticated','public.session_events','DELETE')
           or has_table_privilege('authenticated','public.milestones','INSERT')
           or has_table_privilege('authenticated','public.milestones','UPDATE')
           or has_table_privilege('authenticated','public.milestones','DELETE')),
         null
  union all
  select 34, 'anon has no access to any app table',
         not exists (select 1 from unnest(array['profiles','user_settings','tags','focus_sessions',
                       'session_events','milestones']) t
                      where has_table_privilege('anon', 'public.' || t, 'SELECT')
                         or has_table_privilege('anon', 'public.' || t, 'INSERT')
                         or has_table_privilege('anon', 'public.' || t, 'UPDATE')
                         or has_table_privilege('anon', 'public.' || t, 'DELETE')),
         null
  union all
  select 35, 'profiles: columns clients may edit',
         s.cols = 'avatar_url, display_name, timezone, timezone_confirmed', s.cols
    from (select string_agg(column_name, ', ' order by column_name) as cols
            from information_schema.column_privileges
           where grantee = 'authenticated' and table_schema = 'public'
             and table_name = 'profiles' and privilege_type = 'UPDATE') s
  union all
  select 36, 'policies per table (expect profiles 2, user_settings 2, tags 4, focus_sessions 2, session_events 1, milestones 1)',
         (select count(*) from pg_policies where schemaname='public') = 12,
         (select string_agg(tablename || '=' || n, ', ' order by tablename)
            from (select tablename, count(*) n from pg_policies
                   where schemaname='public' group by tablename) p)
  union all
  select 40, 'time zones available to the server (needs > 100)',
         count(*) > 100, count(*)::text
    from pg_catalog.pg_timezone_names
  union all
  select 41, 'pgTAP extension installed (needed only for supabase test db)',
         null,
         case when exists (select 1 from pg_extension where extname = 'pgtap')
              then 'installed' else 'not installed (normal for the hosted project)' end
  union all
  select 50, 'every user has a profile and a settings row',
         (select count(*) from auth.users) = (select count(*) from public.profiles)
           and (select count(*) from auth.users) = (select count(*) from public.user_settings),
         format('users=%s profiles=%s settings=%s',
                (select count(*) from auth.users), (select count(*) from public.profiles),
                (select count(*) from public.user_settings))
  union all
  select 51, 'profile time zones: confirmed vs not',
         null,
         format('confirmed=%s, still default/unconfirmed=%s',
                (select count(*) from public.profiles where timezone_confirmed),
                (select count(*) from public.profiles where not timezone_confirmed))
  union all
  select 52, 'sessions by status',
         null,
         coalesce((select string_agg(status::text || '=' || n, ', ' order by status::text)
                     from (select status, count(*) n from public.focus_sessions group by status) s),
                  'no sessions yet')
  union all
  select 53, 'no session credited more than its planned length',
         not exists (select 1 from public.focus_sessions where focused_seconds > planned_seconds),
         null
  union all
  select 54, 'no completed session below the 80% presence bar (sessions after 0004)',
         not exists (select 1 from public.focus_sessions
                      where status = 'completed'
                        and present_seconds < ceil(planned_seconds * 0.8)),
         (select count(*)::text || ' completed sessions in total' from public.focus_sessions where status = 'completed')
  union all
  select 55, 'no stale running sessions (more than 5 min past planned end)',
         not exists (select 1 from public.focus_sessions
                      where status = 'running'
                        and now() > started_at + make_interval(secs => planned_seconds + 300)),
         null
  union all
  select 56, 'milestones awarded',
         null, (select count(*)::text from public.milestones)
) checks
order by ord;
