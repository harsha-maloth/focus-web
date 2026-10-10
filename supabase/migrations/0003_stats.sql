-- 0003_stats.sql
-- Stats and milestones, computed in Postgres so the numbers cannot be edited from the client.
--
--   my_stats()          read-only. Totals, 30-day series, tag breakdown, streaks,
--                       milestones. Runs as the caller, so row level security applies.
--   award_milestones()  writes milestone rows for the caller. Clients cannot insert
--                       into milestones themselves.
--
-- Rules:
--   * Days are counted in the user's profile timezone, by the day a session started.
--   * Time counts from completed and abandoned sessions (abandoned keeps real time).
--   * A streak day needs at least one COMPLETED session. A streak is still alive if
--     the last such day was yesterday.
--   * Weeks start on Monday.

create or replace function public.my_stats()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_tz         text;
  v_today      date;
  v_week_start date;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select p.timezone into v_tz from public.profiles p where p.id = v_uid;
  v_tz := coalesce(v_tz, 'UTC');
  v_today := (now() at time zone v_tz)::date;
  v_week_start := date_trunc('week', v_today::timestamp)::date;

  return (
    with s as (
      select (f.started_at at time zone v_tz)::date as day,
             f.focused_seconds,
             f.status,
             f.tag_id
        from public.focus_sessions f
       where f.user_id = v_uid
         and f.status in ('completed', 'abandoned')
    ),
    days as (
      select s.day, sum(s.focused_seconds)::int as seconds
        from s
       group by s.day
    ),
    done_days as (
      select distinct s.day from s where s.status = 'completed'
    ),
    islands as (
      select d.day, d.day - (row_number() over (order by d.day))::int as grp
        from done_days d
    ),
    runs as (
      select min(i.day) as first_day, max(i.day) as last_day, count(*)::int as len
        from islands i
       group by i.grp
    )
    select jsonb_build_object(
      'timezone', v_tz,
      'today', v_today,
      'today_seconds',
        coalesce((select d.seconds from days d where d.day = v_today), 0),
      'week_seconds',
        coalesce((select sum(d.seconds) from days d where d.day >= v_week_start), 0),
      'last_week_seconds',
        coalesce((select sum(d.seconds) from days d
                   where d.day >= v_week_start - 7 and d.day < v_week_start), 0),
      'month_seconds',
        coalesce((select sum(d.seconds) from days d
                   where d.day >= date_trunc('month', v_today::timestamp)::date), 0),
      'total_seconds',
        coalesce((select sum(d.seconds) from days d), 0),
      'total_sessions',
        (select count(*) from s),
      'completed_sessions',
        (select count(*) from s where s.status = 'completed'),
      'current_streak',
        coalesce((select r.len from runs r
                   where r.last_day >= v_today - 1
                   order by r.last_day desc limit 1), 0),
      'longest_streak',
        coalesce((select max(r.len) from runs r), 0),
      'active_today',
        exists (select 1 from done_days d where d.day = v_today),
      'daily',
        (select jsonb_agg(
                  jsonb_build_object('day', v_today - g.n, 'seconds', coalesce(d.seconds, 0))
                  order by g.n desc)
           from generate_series(0, 29) as g(n)
           left join days d on d.day = v_today - g.n),
      'tags',
        (select coalesce(jsonb_agg(to_jsonb(t) order by t.seconds desc), '[]'::jsonb)
           from (
             select s.tag_id, tg.name, tg.color, sum(s.focused_seconds)::int as seconds
               from s
               left join public.tags tg on tg.id = s.tag_id
              where s.day >= v_today - 29
              group by s.tag_id, tg.name, tg.color
           ) t),
      'milestones',
        (select coalesce(jsonb_agg(
                  jsonb_build_object('type', m.type, 'value', m.value, 'achieved_at', m.achieved_at)
                  order by m.achieved_at), '[]'::jsonb)
           from public.milestones m
          where m.user_id = v_uid)
    )
  );
end;
$$;

create or replace function public.award_milestones()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_stats    jsonb;
  v_sessions integer;
  v_hours    integer;
  v_streak   integer;
  v          integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_stats    := public.my_stats();
  v_sessions := (v_stats ->> 'completed_sessions')::integer;
  v_hours    := floor((v_stats ->> 'total_seconds')::numeric / 3600)::integer;
  v_streak   := (v_stats ->> 'longest_streak')::integer;

  foreach v in array array[1, 10, 50, 100, 250] loop
    if v_sessions >= v then
      insert into public.milestones (user_id, type, value) values (v_uid, 'sessions', v)
      on conflict (user_id, type, value) do nothing;
    end if;
  end loop;

  foreach v in array array[1, 10, 50, 100, 500] loop
    if v_hours >= v then
      insert into public.milestones (user_id, type, value) values (v_uid, 'hours', v)
      on conflict (user_id, type, value) do nothing;
    end if;
  end loop;

  foreach v in array array[3, 7, 14, 30, 100] loop
    if v_streak >= v then
      insert into public.milestones (user_id, type, value) values (v_uid, 'streak', v)
      on conflict (user_id, type, value) do nothing;
    end if;
  end loop;
end;
$$;

revoke all on function public.my_stats()          from public, anon;
revoke all on function public.award_milestones()  from public, anon;
grant execute on function public.my_stats()         to authenticated;
grant execute on function public.award_milestones() to authenticated;
