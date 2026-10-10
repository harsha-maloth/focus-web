# Ops log

Changes made outside git: Supabase dashboard, GitHub settings, Google Cloud and other services. Git history cannot show these, so record each one here. Newest at the bottom. Never write secrets.

| Date | Service | Change | Run by | How to undo | Verified |
|---|---|---|---|---|---|
| 2026-10-10 | Supabase | Project created | user | Delete the project in the dashboard | yes |
| 2026-10-10 | Supabase | `0001_init.sql` run in the SQL editor, no errors | user | Drop the objects it created (no down migration) | yes |
| 2026-10-10 | Supabase | Auth Site URL and Redirect URLs set to the Pages URL | user | Edit under Authentication > URL Configuration | yes (magic link works) |
| 2026-10-10 | GitHub | Repo `harsha-maloth/focus-web` created (public), code pushed | user | Make private or delete | yes |
| 2026-10-10 | GitHub | Pages enabled, source GitHub Actions; deploy workflow ran | user | Settings > Pages | yes (site live) |
| 2026-10-10 | GitHub | Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` added | user | Settings > Secrets and variables > Actions | yes (fixed blank page) |
| 2026-10-10 | Supabase | `0002`, `0003`, `0004` applied (user confirmed in chat; exact time and any errors not recorded) | user | No down migrations; restore by dropping the added functions and columns | applied, not yet hand-tested |
| ? | Supabase | Google provider enabled? Not done as of the last log | | | no |
| 2026-10-10 | Supabase | Ran `supabase/checks/health_check.sql` (read-only): 21 PASS, 0 FAIL. 2 users, 7 sessions (5 abandoned, 2 completed), 2 milestones, 598 time zones | user | n/a (read-only) | yes |

## How to add a row
Date, service, what exactly changed (names, not secrets), who ran it, how to reverse it, and whether it was checked afterwards.
