-- Space Scout — RLS hardening (security review 2026-06)
--
-- Rewritten to match the ACTUAL live policies (which differ from 0001's text):
--   live policies are ss_profiles_own / ss_custom_own / ss_custom_published_read
--   / ss_progress_own / ss_preset_own, all granted to role {public} (anon+authed),
--   and there are NO is_master()/role_of() helper functions live.
--
-- Issues fixed:
--   1. HIGH — privilege escalation. ss_profiles_own is `FOR ALL USING
--      (auth.uid()=id)` with no constraint on `role`, so any signed-in user can
--      `update profiles set role='master' where id=auth.uid()` and self-promote
--      to master (full control of all content + the /api/admin/users role API).
--      Fix: split into self-read + self-update-without-role + self-insert-as-player,
--      with role changes only possible via the service-role admin API.
--   2. MEDIUM — anon exposure. Policies target {public}, so the public anon key
--      reaches these tables with no account (published lessons scrapable, etc.).
--      Scope every policy to `authenticated`.

-- Helper: the caller's CURRENT persisted role (SECURITY DEFINER avoids recursive
-- RLS on profiles). Returns 'player' when no row exists yet.
create or replace function public.ss_role_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = uid), 'player');
$$;

create or replace function public.ss_is_master(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.ss_role_of(uid) = 'master';
$$;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Replace the single over-broad ALL policy with role-safe per-command policies.
drop policy if exists ss_profiles_own on public.profiles;

create policy ss_profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.ss_is_master(auth.uid()));

-- Self-insert (if the app ever inserts directly) must be a player.
create policy ss_profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'player');

-- Self-update may change display_name etc. but NOT role: the new role must equal
-- the role already persisted. (Self-promotion blocked here.)
create policy ss_profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.ss_role_of(auth.uid()));

-- Master can manage any profile (this is the only path that can change roles,
-- and it is reachable from the server via the service-role admin client).
create policy ss_profiles_master_all on public.profiles
  for all to authenticated
  using (public.ss_is_master(auth.uid()))
  with check (public.ss_is_master(auth.uid()));

-- ── custom_lessons ──────────────────────────────────────────────────────────
-- Keep owner full control; scope reads to authenticated (block anon scraping).
drop policy if exists ss_custom_own on public.custom_lessons;
create policy ss_custom_own on public.custom_lessons
  for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists ss_custom_published_read on public.custom_lessons;
create policy ss_custom_published_read on public.custom_lessons
  for select to authenticated
  using (is_published = true or auth.uid() = owner_id);

-- ── progress ────────────────────────────────────────────────────────────────
drop policy if exists ss_progress_own on public.progress;
create policy ss_progress_own on public.progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── match_presets ───────────────────────────────────────────────────────────
drop policy if exists ss_preset_own on public.match_presets;
create policy ss_preset_own on public.match_presets
  for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
