-- Space Scout — auth roles + server-synced content
-- Roles: master | coach | player
--   player : play only; owns their progress + match presets
--   coach  : player + CRUD on their OWN unpublished custom lessons
--   master : full control of all custom lessons; can publish into the program
-- Built-in lessons/courses live in code (read-only); "editing a built-in" forks
-- to a published custom lesson (id "custom-of-<builtinId>"), which only master
-- may create/modify.

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles: one row per auth user, carries the role
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'player' check (role in ('master','coach','player')),
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Role lookup helper (SECURITY DEFINER so policies can read the role without
-- recursive RLS on profiles). Returns 'player' when no profile row exists yet.
create or replace function public.role_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = uid), 'player');
$$;

create or replace function public.is_master(uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.role_of(uid) = 'master'; $$;

-- Auto-create a profile (role 'player') whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- custom_lessons: author-created lessons (and master-published program edits)
create table if not exists public.custom_lessons (
  id           text primary key,                       -- app lesson id (incl. custom-of-*)
  owner_id     uuid not null references auth.users(id) on delete cascade,
  data         jsonb not null,                          -- the full Lesson object
  is_published boolean not null default false,          -- true = part of the shared program (master only)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists custom_lessons_owner_idx on public.custom_lessons(owner_id);
create index if not exists custom_lessons_published_idx on public.custom_lessons(is_published);

-- ─────────────────────────────────────────────────────────────────────────────
-- progress: per-user PlayerProgress blob
create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- match_presets: saved Play-Match configs (any role may own their own)
create table if not exists public.match_presets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists match_presets_owner_idx on public.match_presets(owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at touch trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_custom_lessons on public.custom_lessons;
create trigger touch_custom_lessons before update on public.custom_lessons
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_progress on public.progress;
create trigger touch_progress before update on public.progress
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
alter table public.profiles       enable row level security;
alter table public.custom_lessons enable row level security;
alter table public.progress       enable row level security;
alter table public.match_presets  enable row level security;

-- profiles: you can read your own; master can read all. You may update your own
-- display_name but NOT your own role (only master can change roles).
create policy profiles_select_self_or_master on public.profiles
  for select using (id = auth.uid() or public.is_master(auth.uid()));
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_self_no_role on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.role_of(auth.uid()));
create policy profiles_master_all on public.profiles
  for all using (public.is_master(auth.uid())) with check (public.is_master(auth.uid()));

-- custom_lessons:
--   read: anyone authenticated may read PUBLISHED lessons (the shared program);
--         owners read their own; master reads all.
create policy custom_lessons_select on public.custom_lessons
  for select using (
    is_published
    or owner_id = auth.uid()
    or public.is_master(auth.uid())
  );
--   insert: master may insert anything (incl. published). Coaches may insert only
--           their OWN, UNPUBLISHED lessons. Players cannot insert.
create policy custom_lessons_insert on public.custom_lessons
  for insert with check (
    public.is_master(auth.uid())
    or (public.role_of(auth.uid()) = 'coach' and owner_id = auth.uid() and is_published = false)
  );
--   update: master anything; coach only own unpublished, and cannot publish or
--           reassign ownership.
create policy custom_lessons_update on public.custom_lessons
  for update using (
    public.is_master(auth.uid())
    or (public.role_of(auth.uid()) = 'coach' and owner_id = auth.uid() and is_published = false)
  )
  with check (
    public.is_master(auth.uid())
    or (public.role_of(auth.uid()) = 'coach' and owner_id = auth.uid() and is_published = false)
  );
--   delete: master anything; coach only own unpublished.
create policy custom_lessons_delete on public.custom_lessons
  for delete using (
    public.is_master(auth.uid())
    or (public.role_of(auth.uid()) = 'coach' and owner_id = auth.uid() and is_published = false)
  );

-- progress: each user owns their own row.
create policy progress_own on public.progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- match_presets: each user owns their own (any role).
create policy match_presets_own on public.match_presets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
