-- Soccer IQ Lab — coach-scheduled training sessions + reminders.
--
-- Teams reuse the existing siq_teams / siq_team_members tables (a coach owns a
-- team with a join code; players join with the code via siq_join_team()).
--
-- All reads/writes of training sessions go through the app's server routes
-- (/api/team, /api/training, /api/cron/training-reminders) using the service
-- role, AFTER the route verifies the caller (coach of the team / member of the
-- team). So RLS is enabled with NO client policies: the browser can't touch
-- this table directly.
--
-- Safe to run more than once.

create table if not exists public.training_sessions (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.siq_teams(id) on delete cascade,
  coach_id          uuid not null references auth.users(id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 120),
  starts_at         timestamptz not null,
  duration_min      integer not null default 60 check (duration_min between 5 and 600),
  location          text check (location is null or char_length(location) <= 200),
  notes             text check (notes is null or char_length(notes) <= 2000),
  lesson_id         text,                 -- optional in-app lesson to work on
  tz                text,                 -- coach's IANA time zone, for formatting emails
  reminder_sent_at  timestamptz,          -- set once the "coming up" reminder has gone out
  created_at        timestamptz not null default now()
);

create index if not exists training_sessions_team_starts_idx
  on public.training_sessions (team_id, starts_at);
create index if not exists training_sessions_due_idx
  on public.training_sessions (starts_at) where reminder_sent_at is null;

alter table public.training_sessions enable row level security;
-- (no policies on purpose — server routes only)
