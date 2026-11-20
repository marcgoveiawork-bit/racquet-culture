-- Racquet Culture: shared live database
-- Run this once in Supabase: SQL Editor, New query, paste everything, Run. Safe to run again.

-- Player profiles. One row per account, created when someone signs up.
create table if not exists public.rc_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null check (char_length(username) between 3 and 100 and username ~ '^[A-Za-z0-9._-]+$'),
  name        text not null check (char_length(name) between 1 and 60),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create unique index if not exists rc_profiles_username_lower on public.rc_profiles (lower(username));

-- Logged games. Levels and rankings are worked out from these, so everyone sees the same numbers.
create table if not exists public.rc_matches (
  id          text primary key,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.rc_profiles enable row level security;
alter table public.rc_matches  enable row level security;

-- Signed-in players can see everyone's profile and every game.
-- Each player can only create or change their own profile, log games as themselves,
-- and delete games they logged.
drop policy if exists "rc profiles read"   on public.rc_profiles;
drop policy if exists "rc profiles insert" on public.rc_profiles;
drop policy if exists "rc profiles update" on public.rc_profiles;
create policy "rc profiles read"   on public.rc_profiles for select to authenticated using (true);
create policy "rc profiles insert" on public.rc_profiles for insert to authenticated with check (auth.uid() = id);
create policy "rc profiles update" on public.rc_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "rc matches read"   on public.rc_matches;
drop policy if exists "rc matches insert" on public.rc_matches;
drop policy if exists "rc matches delete" on public.rc_matches;
create policy "rc matches read"   on public.rc_matches for select to authenticated using (true);
create policy "rc matches insert" on public.rc_matches for insert to authenticated with check (auth.uid() = created_by);
create policy "rc matches delete" on public.rc_matches for delete to authenticated using (auth.uid() = created_by);

grant select, insert, update on public.rc_profiles to authenticated;
grant select, insert, delete on public.rc_matches  to authenticated;

-- "Is this username taken?" for the sign-up page, before the person has an account.
-- Answers yes or no only; it never reveals anyone's profile.
create or replace function public.rc_username_taken(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_profiles where lower(username) = lower(trim(u)));
$$;
revoke all on function public.rc_username_taken(text) from public;
grant execute on function public.rc_username_taken(text) to anon, authenticated;

-- ============ Bookings, inbox, score confirmations and admins (added November 2026) ============

-- Admins: club staff with extra control. Only added here in Supabase (see the end of this file), never from the app.
create table if not exists public.rc_admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  added_at  timestamptz not null default now()
);
alter table public.rc_admins enable row level security;
drop policy if exists "rc admins read" on public.rc_admins;
create policy "rc admins read" on public.rc_admins for select to authenticated using (true);
grant select on public.rc_admins to authenticated;

create or replace function public.rc_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_admins where user_id = auth.uid());
$$;
revoke all on function public.rc_is_admin() from public;
grant execute on function public.rc_is_admin() to authenticated;

-- Admins can correct or delete any score
drop policy if exists "rc matches delete"       on public.rc_matches;
drop policy if exists "rc matches admin update" on public.rc_matches;
create policy "rc matches delete"       on public.rc_matches for delete to authenticated using (auth.uid() = created_by or public.rc_is_admin());
create policy "rc matches admin update" on public.rc_matches for update to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());
grant update on public.rc_matches to authenticated;

-- Players confirming a score, or asking for it to be changed
create table if not exists public.rc_confirmations (
  id          text primary key,
  match_id    text not null references public.rc_matches(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  verdict     text not null check (verdict in ('ok','dispute')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.rc_confirmations enable row level security;
drop policy if exists "rc conf read"   on public.rc_confirmations;
drop policy if exists "rc conf insert" on public.rc_confirmations;
create policy "rc conf read"   on public.rc_confirmations for select to authenticated using (true);
create policy "rc conf insert" on public.rc_confirmations for insert to authenticated with check (auth.uid() = user_id);
grant select, insert on public.rc_confirmations to authenticated;

-- Court bookings in 30-minute slots (slot 0 = 6:00 am, slot 35 = 11:30 pm).
-- The database itself refuses two bookings that overlap on the same court.
create extension if not exists btree_gist with schema extensions;
create table if not exists public.rc_bookings (
  id          text primary key,
  court       text not null check (court in ('padel','pickleball')),
  day         date not null,
  start_slot  smallint not null check (start_slot between 0 and 35),
  len         smallint not null check (len between 1 and 36 and start_slot + len <= 36),
  kind        text not null default 'game' check (kind in ('game','block')),
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint rc_bookings_no_overlap exclude using gist (court with =, day with =, int4range(start_slot::int, (start_slot + len)::int) with &&)
);
alter table public.rc_bookings enable row level security;
drop policy if exists "rc bookings read"   on public.rc_bookings;
drop policy if exists "rc bookings insert" on public.rc_bookings;
drop policy if exists "rc bookings update" on public.rc_bookings;
drop policy if exists "rc bookings delete" on public.rc_bookings;
create policy "rc bookings read"   on public.rc_bookings for select to authenticated using (true);
-- Anyone can book a game for themselves; only admins can block slots
create policy "rc bookings insert" on public.rc_bookings for insert to authenticated
  with check (auth.uid() = created_by and (kind = 'game' or public.rc_is_admin()));
-- The host, an admin, or an invited player (to say yes or no) can update a booking
create policy "rc bookings update" on public.rc_bookings for update to authenticated
  using (auth.uid() = created_by or public.rc_is_admin() or (data->'invited') ? (auth.uid()::text))
  with check (auth.uid() = created_by or public.rc_is_admin() or (data->'invited') ? (auth.uid()::text));
create policy "rc bookings delete" on public.rc_bookings for delete to authenticated using (auth.uid() = created_by or public.rc_is_admin());
grant select, insert, update, delete on public.rc_bookings to authenticated;

-- Inbox: each player only ever sees their own messages
create table if not exists public.rc_messages (
  id          text primary key,
  to_user     uuid not null references auth.users(id) on delete cascade,
  from_user   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null,
  data        jsonb not null default '{}'::jsonb,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists rc_messages_to on public.rc_messages (to_user, created_at desc);
alter table public.rc_messages enable row level security;
drop policy if exists "rc msg read"   on public.rc_messages;
drop policy if exists "rc msg insert" on public.rc_messages;
drop policy if exists "rc msg update" on public.rc_messages;
drop policy if exists "rc msg delete" on public.rc_messages;
create policy "rc msg read"   on public.rc_messages for select to authenticated using (auth.uid() = to_user);
create policy "rc msg insert" on public.rc_messages for insert to authenticated with check (auth.uid() = from_user);
create policy "rc msg update" on public.rc_messages for update to authenticated using (auth.uid() = to_user) with check (auth.uid() = to_user);
create policy "rc msg delete" on public.rc_messages for delete to authenticated using (auth.uid() = to_user);
grant select, insert, update, delete on public.rc_messages to authenticated;

-- Send new games and profile changes to everyone who has the app open.
alter table public.rc_profiles replica identity full;
alter table public.rc_matches  replica identity full;
do $$ begin alter publication supabase_realtime add table public.rc_profiles; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rc_matches;  exception when duplicate_object then null; end $$;
alter table public.rc_bookings      replica identity full;
alter table public.rc_confirmations replica identity full;
alter table public.rc_messages      replica identity full;
do $$ begin alter publication supabase_realtime add table public.rc_bookings;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rc_confirmations; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rc_messages;      exception when duplicate_object then null; end $$;

-- ============ Making someone an admin ============
-- Put their app username between the quotes, select just these lines and press Run.
-- insert into public.rc_admins (user_id) select id from public.rc_profiles where lower(username) = lower('USERNAME') on conflict do nothing;
-- To remove an admin:
-- delete from public.rc_admins where user_id = (select id from public.rc_profiles where lower(username) = lower('USERNAME'));
