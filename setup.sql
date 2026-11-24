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

-- ============ Friends and following (added November 2026) ============

-- Following: one-way, no approval needed
create table if not exists public.rc_follows (
  id          text primary key,
  follower    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  followee    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (follower, followee),
  check (follower <> followee)
);
alter table public.rc_follows enable row level security;
drop policy if exists "rc follows read"   on public.rc_follows;
drop policy if exists "rc follows insert" on public.rc_follows;
drop policy if exists "rc follows delete" on public.rc_follows;
create policy "rc follows read"   on public.rc_follows for select to authenticated using (true);
create policy "rc follows insert" on public.rc_follows for insert to authenticated with check (auth.uid() = follower);
create policy "rc follows delete" on public.rc_follows for delete to authenticated using (auth.uid() = follower);
grant select, insert, delete on public.rc_follows to authenticated;

-- Friend requests. Friends = an accepted request either way. Each player only sees their own requests.
create table if not exists public.rc_friend_requests (
  id            text primary key,
  from_user     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  to_user       uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (from_user <> to_user)
);
create index if not exists rc_friend_requests_pair on public.rc_friend_requests (from_user, to_user);
alter table public.rc_friend_requests enable row level security;

-- True if this player rejected a request from the signed-in player in the last 5 days
create or replace function public.rc_recently_rejected(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_friend_requests r
    where r.from_user = auth.uid() and r.to_user = target and r.status = 'rejected'
      and coalesce(r.responded_at, r.created_at) > now() - interval '5 days');
$$;
-- True if the player has an open account (anyone can add them as a friend without a request)
create or replace function public.rc_is_open(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select data->>'friends' = 'open' from public.rc_profiles where id = target), false);
$$;
revoke all on function public.rc_recently_rejected(uuid) from public;
revoke all on function public.rc_is_open(uuid) from public;
grant execute on function public.rc_recently_rejected(uuid) to authenticated;
grant execute on function public.rc_is_open(uuid) to authenticated;

drop policy if exists "rc fr read"   on public.rc_friend_requests;
drop policy if exists "rc fr insert" on public.rc_friend_requests;
drop policy if exists "rc fr answer" on public.rc_friend_requests;
drop policy if exists "rc fr delete" on public.rc_friend_requests;
create policy "rc fr read" on public.rc_friend_requests for select to authenticated using (auth.uid() in (from_user, to_user));
-- Send a request (or become friends straight away with an open account), but not within 5 days of being rejected
create policy "rc fr insert" on public.rc_friend_requests for insert to authenticated
  with check (auth.uid() = from_user and not public.rc_recently_rejected(to_user)
              and (status = 'pending' or (status = 'accepted' and public.rc_is_open(to_user))));
-- Only the person who received a request can accept or reject it
create policy "rc fr answer" on public.rc_friend_requests for update to authenticated
  using (auth.uid() = to_user) with check (auth.uid() = to_user and status in ('accepted','rejected'));
-- Cancel a request or remove a friend. A rejection stays, so the 5-day wait can't be skipped.
create policy "rc fr delete" on public.rc_friend_requests for delete to authenticated using (auth.uid() in (from_user, to_user) and status <> 'rejected');
grant select, insert, update, delete on public.rc_friend_requests to authenticated;

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
alter table public.rc_follows         replica identity full;
alter table public.rc_friend_requests replica identity full;
do $$ begin alter publication supabase_realtime add table public.rc_follows;         exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rc_friend_requests; exception when duplicate_object then null; end $$;

-- Level feedback: after a game, a player can say whether each other player's level looks right.
-- Profiles only show a summary (for example "Most players say this level is about right"), never who voted.
create table if not exists public.rc_level_votes (
  id          text primary key,
  voter       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target      uuid not null references auth.users(id) on delete cascade,
  sport       text not null check (sport in ('padel','pickleball')),
  match_id    text not null,
  vote        text not null check (vote in ('higher','right','lower')),
  created_at  timestamptz not null default now(),
  unique (voter, target, match_id),
  check (voter <> target)
);
alter table public.rc_level_votes enable row level security;
drop policy if exists "rc level votes read"   on public.rc_level_votes;
drop policy if exists "rc level votes insert" on public.rc_level_votes;
create policy "rc level votes read"   on public.rc_level_votes for select to authenticated using (true);
-- only players who were in that game can vote on it
create policy "rc level votes insert" on public.rc_level_votes for insert to authenticated with check (
  auth.uid() = voter and exists (select 1 from public.rc_matches m where m.id = match_id
    and (m.data::text like '%' || auth.uid()::text || '%') and (m.data::text like '%' || target::text || '%')));
grant select, insert on public.rc_level_votes to authenticated;

-- Club settings (for now: court slot prices). Everyone signed in can read them, only admins can change them.
create table if not exists public.rc_settings (
  key         text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid() references auth.users(id) on delete set null
);
alter table public.rc_settings enable row level security;
drop policy if exists "rc settings read"   on public.rc_settings;
drop policy if exists "rc settings insert" on public.rc_settings;
drop policy if exists "rc settings update" on public.rc_settings;
create policy "rc settings read"   on public.rc_settings for select to authenticated using (true);
create policy "rc settings insert" on public.rc_settings for insert to authenticated with check (public.rc_is_admin());
create policy "rc settings update" on public.rc_settings for update to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());
grant select, insert, update on public.rc_settings to authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_settings; exception when duplicate_object then null; end $$;

-- Bookings made by players always start as "pending" until an admin confirms them.
-- Only admins can confirm: anyone else's change keeps the booking's current status.
create or replace function public.rc_booking_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.rc_is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.kind = 'game' then new.data := jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{status}', '"pending"'); end if;
  else
    new.data := jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{status}', coalesce(old.data->'status','"confirmed"'::jsonb));
    if old.data ? 'confirmedBy' then new.data := jsonb_set(new.data, '{confirmedBy}', old.data->'confirmedBy'); end if;
  end if;
  return new;
end $$;
drop trigger if exists rc_booking_status on public.rc_bookings;
create trigger rc_booking_status before insert or update on public.rc_bookings for each row execute function public.rc_booking_status();

-- Late and no-show reports that an admin has confirmed (or dismissed).
-- Everyone signed in can read them (they power the reliability line on profiles); only admins can add them.
-- Who sent the report stays inside the admins' inbox, not in this table's public columns.
create table if not exists public.rc_conduct (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('late','noshow','dismissed')),
  sport       text not null check (sport in ('padel','pickleball')),
  report      text unique,
  data        jsonb not null default '{}'::jsonb,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.rc_conduct enable row level security;
drop policy if exists "rc conduct read"   on public.rc_conduct;
drop policy if exists "rc conduct insert" on public.rc_conduct;
drop policy if exists "rc conduct delete" on public.rc_conduct;
create policy "rc conduct read"   on public.rc_conduct for select to authenticated using (true);
create policy "rc conduct insert" on public.rc_conduct for insert to authenticated with check (public.rc_is_admin() and auth.uid() = created_by and user_id <> auth.uid());
create policy "rc conduct delete" on public.rc_conduct for delete to authenticated using (public.rc_is_admin());
grant select, insert, delete on public.rc_conduct to authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_conduct; exception when duplicate_object then null; end $$;

-- Inbox safety: only admins can send club news (community), admin replies and conduct notices.
-- Everyone else can still send their normal messages (score checks, invites, kudos, messages to the admins).
drop policy if exists "rc msg insert" on public.rc_messages;
create policy "rc msg insert" on public.rc_messages for insert to authenticated with check (
  auth.uid() = from_user
  and (kind not in ('community','admin_reply','conduct') or public.rc_is_admin())
  and length(coalesce(data->>'text','')) <= case when public.rc_is_admin() then 600 else 160 end
);

-- Phone numbers live in their own private table, never in the public profile.
-- Who can read a number: the player, club admins, and (if the player allows it) their friends or everyone.
create table if not exists public.rc_private (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  phone       text check (phone ~ '^\+[0-9]{1,4} [0-9]{6,14}$'),
  vis         text not null default 'admins' check (vis in ('admins','friends','all')),
  updated_at  timestamptz not null default now()
);
alter table public.rc_private enable row level security;
drop policy if exists "rc private read"   on public.rc_private;
drop policy if exists "rc private insert" on public.rc_private;
drop policy if exists "rc private update" on public.rc_private;
create policy "rc private read" on public.rc_private for select to authenticated using (
  user_id = auth.uid()
  or public.rc_is_admin()
  or vis = 'all'
  or (vis = 'friends' and exists (select 1 from public.rc_friend_requests r where r.status = 'accepted'
        and ((r.from_user = auth.uid() and r.to_user = rc_private.user_id) or (r.to_user = auth.uid() and r.from_user = rc_private.user_id))))
);
create policy "rc private insert" on public.rc_private for insert to authenticated with check (user_id = auth.uid());
create policy "rc private update" on public.rc_private for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.rc_private to authenticated;

-- Coach accounts, and letting admins change account types from the app.
create table if not exists public.rc_coaches (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  sports      text[] not null default '{padel}',
  auto        boolean not null default false,   -- true: their coaching blocks go straight through
  updated_at  timestamptz not null default now()
);
alter table public.rc_coaches enable row level security;
drop policy if exists "rc coaches read"  on public.rc_coaches;
drop policy if exists "rc coaches write" on public.rc_coaches;
create policy "rc coaches read"  on public.rc_coaches for select to authenticated using (true);
create policy "rc coaches write" on public.rc_coaches for all to authenticated using (public.rc_is_admin()) with check (public.rc_is_admin());
grant select, insert, update, delete on public.rc_coaches to authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_coaches; exception when duplicate_object then null; end $$;

-- Admin access is given or removed by the developer (see the Developer section below), or here in Supabase.
drop policy if exists "rc admins insert" on public.rc_admins;
drop policy if exists "rc admins delete" on public.rc_admins;
revoke insert, update, delete on public.rc_admins from authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_admins; exception when duplicate_object then null; end $$;

create or replace function public.rc_is_coach() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_coaches where user_id = auth.uid());
$$;
revoke all on function public.rc_is_coach() from public;
grant execute on function public.rc_is_coach() to authenticated;

-- Players book games; admins and coaches can block slots
drop policy if exists "rc bookings insert" on public.rc_bookings;
create policy "rc bookings insert" on public.rc_bookings for insert to authenticated
  with check (auth.uid() = created_by and (kind = 'game' or public.rc_is_admin() or public.rc_is_coach()));

-- Status rules: player bookings start pending; a coach's block is confirmed straight away only if an admin allowed it,
-- and is always marked as Coaching. Only admins can confirm anything.
create or replace function public.rc_booking_status() returns trigger language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if public.rc_is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.kind = 'game' then
      new.data := jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{status}', '"pending"');
    else
      select auto into ok from public.rc_coaches where user_id = auth.uid();
      new.data := jsonb_set(jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{reason}', '"Coaching"'),
                            '{status}', case when coalesce(ok,false) then '"confirmed"'::jsonb else '"pending"'::jsonb end);
    end if;
  else
    new.data := jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{status}', coalesce(old.data->'status','"confirmed"'::jsonb));
    if old.data ? 'confirmedBy' then new.data := jsonb_set(new.data, '{confirmedBy}', old.data->'confirmedBy'); end if;
  end if;
  return new;
end $$;
drop trigger if exists rc_booking_status on public.rc_bookings;
create trigger rc_booking_status before insert or update on public.rc_bookings for each row execute function public.rc_booking_status();

-- Developer role: an admin who can also give or remove admin access from the app.
create table if not exists public.rc_developers (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.rc_developers enable row level security;
drop policy if exists "rc developers read" on public.rc_developers;
create policy "rc developers read" on public.rc_developers for select to authenticated using (true);
grant select on public.rc_developers to authenticated;   -- no one can add developers from the app

create or replace function public.rc_is_dev() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_developers where user_id = auth.uid());
$$;
revoke all on function public.rc_is_dev() from public;
grant execute on function public.rc_is_dev() to authenticated;

-- Only the developer can make someone an admin or take admin away (never a developer, never themselves)
drop policy if exists "rc admins insert" on public.rc_admins;
drop policy if exists "rc admins delete" on public.rc_admins;
create policy "rc admins insert" on public.rc_admins for insert to authenticated with check (public.rc_is_dev());
create policy "rc admins delete" on public.rc_admins for delete to authenticated
  using (public.rc_is_dev() and user_id <> auth.uid() and not exists (select 1 from public.rc_developers d where d.user_id = rc_admins.user_id));
grant insert, delete on public.rc_admins to authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_developers; exception when duplicate_object then null; end $$;


-- ============ Making someone an admin ============
-- Put their app username between the quotes, select just these lines and press Run.
-- insert into public.rc_admins (user_id) select id from public.rc_profiles where lower(username) = lower('USERNAME') on conflict do nothing;
-- To remove an admin:
-- delete from public.rc_admins where user_id = (select id from public.rc_profiles where lower(username) = lower('USERNAME'));

-- Demo access: the developer chooses who can open demo mode (new updates before they go live).
create table if not exists public.rc_demo_access (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.rc_demo_access enable row level security;
drop policy if exists "rc demo read"   on public.rc_demo_access;
drop policy if exists "rc demo insert" on public.rc_demo_access;
drop policy if exists "rc demo delete" on public.rc_demo_access;
create policy "rc demo read"   on public.rc_demo_access for select to authenticated using (user_id = auth.uid() or public.rc_is_dev());
create policy "rc demo insert" on public.rc_demo_access for insert to authenticated with check (public.rc_is_dev());
create policy "rc demo delete" on public.rc_demo_access for delete to authenticated using (public.rc_is_dev());
grant select, insert, delete on public.rc_demo_access to authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_demo_access; exception when duplicate_object then null; end $$;

-- Owners: same powers as admins (they are also in rc_admins), plus giving or removing admin access.
-- Only the developer can make or remove owners.
create table if not exists public.rc_owners (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.rc_owners enable row level security;
drop policy if exists "rc owners read"   on public.rc_owners;
drop policy if exists "rc owners insert" on public.rc_owners;
drop policy if exists "rc owners delete" on public.rc_owners;
create policy "rc owners read"   on public.rc_owners for select to authenticated using (true);
create policy "rc owners insert" on public.rc_owners for insert to authenticated with check (public.rc_is_dev());
create policy "rc owners delete" on public.rc_owners for delete to authenticated using (public.rc_is_dev() and user_id <> auth.uid());
grant select, insert, delete on public.rc_owners to authenticated;

create or replace function public.rc_is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_owners where user_id = auth.uid());
$$;
revoke all on function public.rc_is_owner() from public;
grant execute on function public.rc_is_owner() to authenticated;

-- Admin access: the developer or an owner can give it; taking it away never touches the developer, an owner
-- (unless the developer does it) or yourself.
drop policy if exists "rc admins insert" on public.rc_admins;
drop policy if exists "rc admins delete" on public.rc_admins;
create policy "rc admins insert" on public.rc_admins for insert to authenticated with check (public.rc_is_dev() or public.rc_is_owner());
create policy "rc admins delete" on public.rc_admins for delete to authenticated
  using ((public.rc_is_dev() or public.rc_is_owner())
         and user_id <> auth.uid()
         and not exists (select 1 from public.rc_developers d where d.user_id = rc_admins.user_id)
         and (public.rc_is_dev() or not exists (select 1 from public.rc_owners o where o.user_id = rc_admins.user_id)));
grant insert, delete on public.rc_admins to authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_owners; exception when duplicate_object then null; end $$;

-- ============ Per-club roles (My Padel, several clubs) ============
-- Owners, admins and coaches now belong to one club each (venue). A person can be admin at one club and a player at another.
-- Every existing row belongs to Racquet Culture ('rc'), so the live app keeps working exactly as before.
-- The developer (rc_developers) keeps every power at every club. Safe to re-run.

alter table public.rc_admins  add column if not exists venue text not null default 'rc';
alter table public.rc_owners  add column if not exists venue text not null default 'rc';
alter table public.rc_coaches add column if not exists venue text not null default 'rc';

-- one row per person per club
do $$
declare t text;
begin
  foreach t in array array['rc_admins','rc_owners','rc_coaches'] loop
    if exists (select 1 from pg_constraint where conrelid = ('public.'||t)::regclass and contype = 'p'
               and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id)') then
      execute format('alter table public.%I drop constraint %I', t, t||'_pkey');
      execute format('alter table public.%I add constraint %I primary key (user_id, venue)', t, t||'_pkey');
    end if;
  end loop;
end $$;

-- role checks for a given club (the developer counts everywhere)
create or replace function public.rc_is_admin_at(v text) returns boolean language sql stable security definer set search_path = public as $$
  select public.rc_is_dev() or exists (select 1 from public.rc_admins where user_id = auth.uid() and venue = coalesce(v,'rc'));
$$;
create or replace function public.rc_is_owner_at(v text) returns boolean language sql stable security definer set search_path = public as $$
  select public.rc_is_dev() or exists (select 1 from public.rc_owners where user_id = auth.uid() and venue = coalesce(v,'rc'));
$$;
create or replace function public.rc_is_coach_at(v text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_coaches where user_id = auth.uid() and venue = coalesce(v,'rc'));
$$;
-- an admin at any club (phone numbers stay visible to club admins)
create or replace function public.rc_is_any_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.rc_is_dev() or exists (select 1 from public.rc_admins where user_id = auth.uid());
$$;
revoke all on function public.rc_is_admin_at(text), public.rc_is_owner_at(text), public.rc_is_coach_at(text), public.rc_is_any_admin() from public;
grant execute on function public.rc_is_admin_at(text), public.rc_is_owner_at(text), public.rc_is_coach_at(text), public.rc_is_any_admin() to authenticated;

-- the old checks now mean "at Racquet Culture": court bookings, slot prices and coaching blocks only exist there
create or replace function public.rc_is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_admins where user_id = auth.uid() and venue = 'rc');
$$;
create or replace function public.rc_is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_owners where user_id = auth.uid() and venue = 'rc');
$$;
create or replace function public.rc_is_coach() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_coaches where user_id = auth.uid() and venue = 'rc');
$$;
create or replace function public.rc_booking_status() returns trigger language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if public.rc_is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.kind = 'game' then
      new.data := jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{status}', '"pending"');
    else
      select auto into ok from public.rc_coaches where user_id = auth.uid() and venue = 'rc';
      new.data := jsonb_set(jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{reason}', '"Coaching"'),
                            '{status}', case when coalesce(ok,false) then '"confirmed"'::jsonb else '"pending"'::jsonb end);
    end if;
  else
    new.data := jsonb_set(coalesce(new.data,'{}'::jsonb) - 'confirmedBy', '{status}', coalesce(old.data->'status','"confirmed"'::jsonb));
    if old.data ? 'confirmedBy' then new.data := jsonb_set(new.data, '{confirmedBy}', old.data->'confirmedBy'); end if;
  end if;
  return new;
end $$;

-- who can give which role, at which club:
--   the developer: owners, admins and coaches anywhere
--   an owner: admins at their own club
--   an admin: coaches at their own club
drop policy if exists "rc admins insert" on public.rc_admins;
drop policy if exists "rc admins delete" on public.rc_admins;
create policy "rc admins insert" on public.rc_admins for insert to authenticated with check (public.rc_is_owner_at(venue));
create policy "rc admins delete" on public.rc_admins for delete to authenticated
  using (public.rc_is_owner_at(venue)
         and user_id <> auth.uid()
         and not exists (select 1 from public.rc_developers d where d.user_id = rc_admins.user_id)
         and (public.rc_is_dev() or not exists (select 1 from public.rc_owners o where o.user_id = rc_admins.user_id and o.venue = rc_admins.venue)));
drop policy if exists "rc coaches write" on public.rc_coaches;
create policy "rc coaches write" on public.rc_coaches for all to authenticated using (public.rc_is_admin_at(venue)) with check (public.rc_is_admin_at(venue));

-- scores and reports: only that club's admins (games without a club are Racquet Culture's)
drop policy if exists "rc matches delete" on public.rc_matches;
drop policy if exists "rc matches admin update" on public.rc_matches;
create policy "rc matches delete" on public.rc_matches for delete to authenticated using (auth.uid() = created_by or public.rc_is_admin_at(data->>'venue'));
create policy "rc matches admin update" on public.rc_matches for update to authenticated using (public.rc_is_admin_at(data->>'venue')) with check (public.rc_is_admin_at(data->>'venue'));
drop policy if exists "rc conduct insert" on public.rc_conduct;
drop policy if exists "rc conduct delete" on public.rc_conduct;
create policy "rc conduct insert" on public.rc_conduct for insert to authenticated with check (public.rc_is_admin_at(data->>'venue') and auth.uid() = created_by and user_id <> auth.uid());
create policy "rc conduct delete" on public.rc_conduct for delete to authenticated using (public.rc_is_admin_at(data->>'venue'));

-- club news, admin replies and conduct notices: only that club's admins
drop policy if exists "rc msg insert" on public.rc_messages;
create policy "rc msg insert" on public.rc_messages for insert to authenticated with check (
  auth.uid() = from_user
  and (kind not in ('community','admin_reply','conduct') or public.rc_is_admin_at(data->>'venue'))
  and length(coalesce(data->>'text','')) <= case when public.rc_is_admin_at(data->>'venue') then 600 else 160 end
);

-- phone numbers: still visible to admins (of any club)
drop policy if exists "rc private read" on public.rc_private;
create policy "rc private read" on public.rc_private for select to authenticated using (
  user_id = auth.uid()
  or public.rc_is_any_admin()
  or vis = 'all'
  or (vis = 'friends' and exists (select 1 from public.rc_friend_requests r where r.status = 'accepted'
        and ((r.from_user = auth.uid() and r.to_user = rc_private.user_id) or (r.to_user = auth.uid() and r.from_user = rc_private.user_id))))
);
-- Advertisements shown in the window at the top of every page.
-- One row per venue id, plus 'default' for venues without their own. items is a list of
-- {"src": url, "type": "image"|"video", "bg": css colour}. An empty list means no ads at that venue.
-- Everyone can read them, only the Developer can change them.
create table if not exists public.rc_ads (
  venue       text primary key,
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid() references auth.users(id) on delete set null
);
alter table public.rc_ads enable row level security;
drop policy if exists "rc ads read"   on public.rc_ads;
drop policy if exists "rc ads insert" on public.rc_ads;
drop policy if exists "rc ads update" on public.rc_ads;
drop policy if exists "rc ads delete" on public.rc_ads;
create policy "rc ads read"   on public.rc_ads for select to anon, authenticated using (true);
create policy "rc ads insert" on public.rc_ads for insert to authenticated with check (public.rc_is_dev());
create policy "rc ads update" on public.rc_ads for update to authenticated using (public.rc_is_dev()) with check (public.rc_is_dev());
create policy "rc ads delete" on public.rc_ads for delete to authenticated using (public.rc_is_dev());
grant select on public.rc_ads to anon, authenticated;
grant insert, update, delete on public.rc_ads to authenticated;
do $$ begin alter publication supabase_realtime add table public.rc_ads; exception when duplicate_object then null; end $$;

-- Ad images and videos uploaded from the app (public to view, up to 50 MB each, Developer only to add or remove).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rc-ads', 'rc-ads', true, 52428800, array['image/*','video/*'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "rc ads files insert" on storage.objects;
drop policy if exists "rc ads files update" on storage.objects;
drop policy if exists "rc ads files delete" on storage.objects;
create policy "rc ads files insert" on storage.objects for insert to authenticated with check (bucket_id = 'rc-ads' and public.rc_is_dev());
create policy "rc ads files update" on storage.objects for update to authenticated using (bucket_id = 'rc-ads' and public.rc_is_dev());
create policy "rc ads files delete" on storage.objects for delete to authenticated using (bucket_id = 'rc-ads' and public.rc_is_dev());

-- ============ Security fixes (24 Nov 2026) ============

-- Club notices: only staff at that club can send club-style notices, and only the developer can send demo access notices
drop policy if exists "rc msg insert" on public.rc_messages;
create policy "rc msg insert" on public.rc_messages for insert to authenticated with check (
  auth.uid() = from_user
  and (kind not in ('community','admin_reply','conduct','role','pro','game_logged','game_edit','game_cancel','resolved','bk_confirmed','bk_declined','report_done')
       or public.rc_is_admin_at(data->>'venue'))
  and (kind <> 'demo_access' or public.rc_is_dev())
  and length(coalesce(data->>'text','')) <= case when public.rc_is_admin_at(data->>'venue') then 600 else 160 end
);

-- Bookings: an invited player can only change their own in or out answer; nobody but staff can change a booking's type or owner
create or replace function public.rc_booking_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text;
begin
  if public.rc_is_admin_at(coalesce(old.data->>'venue','rc')) then return new; end if;
  if new.created_by is distinct from old.created_by or new.kind is distinct from old.kind then
    raise exception 'Only club staff can change who owns a booking or its type' using errcode = '42501';
  end if;
  if old.created_by = auth.uid() then return new; end if;
  -- invited player: everything stays the same except their own entry in going / declined
  if new.court is distinct from old.court or new.day is distinct from old.day or new.start_slot is distinct from old.start_slot or new.len is distinct from old.len
     or (coalesce(new.data,'{}') - 'going' - 'declined' - 'status' - 'confirmedBy') is distinct from (coalesce(old.data,'{}') - 'going' - 'declined' - 'status' - 'confirmedBy')
     or (select coalesce(jsonb_agg(x order by x),'[]') from jsonb_array_elements_text(case when jsonb_typeof(new.data->'going')='array' then new.data->'going' else '[]' end) x where x <> me)
        is distinct from (select coalesce(jsonb_agg(x order by x),'[]') from jsonb_array_elements_text(case when jsonb_typeof(old.data->'going')='array' then old.data->'going' else '[]' end) x where x <> me)
     or (select coalesce(jsonb_agg(x order by x),'[]') from jsonb_array_elements_text(case when jsonb_typeof(new.data->'declined')='array' then new.data->'declined' else '[]' end) x where x <> me)
        is distinct from (select coalesce(jsonb_agg(x order by x),'[]') from jsonb_array_elements_text(case when jsonb_typeof(old.data->'declined')='array' then old.data->'declined' else '[]' end) x where x <> me)
  then
    raise exception 'Invited players can only say if they are in or out' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.rc_booking_guard() from public, anon, authenticated;
drop trigger if exists rc_booking_guard on public.rc_bookings;
create trigger rc_booking_guard before update on public.rc_bookings for each row execute function public.rc_booking_guard();

-- Levels and Pro: players can't put themselves in Pro or pick a level above Intermediate; owners and the developer grant Pro with rc_set_pro
create or replace function public.rc_profile_guard() returns trigger language plpgsql security invoker set search_path = public as $$
declare sp text; lv jsonb; cap numeric; a jsonb;
begin
  if current_user not in ('authenticated','anon') then return new; end if;   -- rc_set_pro and SQL run as the owner
  -- Pro status only changes through rc_set_pro
  if tg_op = 'UPDATE' and old.data ? 'pro' then new.data := jsonb_set(coalesce(new.data,'{}'), '{pro}', old.data->'pro');
  else new.data := coalesce(new.data,'{}') - 'pro'; end if;
  -- Levels a player sets themselves stay below Pro
  if tg_op = 'INSERT' or (new.data->'levels') is distinct from (old.data->'levels') then
    for sp, lv in select key, value from jsonb_each(case when jsonb_typeof(new.data->'levels')='object' then new.data->'levels' else '{}' end) loop
      cap := case sp when 'padel' then 4.5 when 'pickleball' then 4.0 else null end;
      if cap is null or jsonb_typeof(lv) <> 'object' then continue; end if;
      if lv->>'band' = 'pro' or (jsonb_typeof(lv->'start')='number' and (lv->>'start')::numeric >= cap) then
        raise exception 'Pro is invite only' using errcode = '42501';
      end if;
      if jsonb_typeof(lv->'adj') = 'array' then
        for a in select value from jsonb_array_elements(lv->'adj') loop
          if jsonb_typeof(a->'r')='number' and (a->>'r')::numeric >= cap then
            raise exception 'Pro is invite only' using errcode = '42501';
          end if;
        end loop;
      end if;
    end loop;
  end if;
  return new;
end $$;
revoke execute on function public.rc_profile_guard() from public, anon, authenticated;
drop trigger if exists rc_profile_guard on public.rc_profiles;
create trigger rc_profile_guard before insert or update on public.rc_profiles for each row execute function public.rc_profile_guard();

create or replace function public.rc_set_pro(target uuid, v text, sp text, on_ boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare p jsonb;
begin
  if auth.uid() is null or not public.rc_is_owner_at(v) then raise exception 'Only the club owner or the developer can change Pro' using errcode = '42501'; end if;
  if sp not in ('padel','pickleball') then raise exception 'Unknown sport'; end if;
  select coalesce(data->'pro','{}') into p from public.rc_profiles where id = target for update;
  if not found then raise exception 'Player not found'; end if;
  if coalesce(jsonb_typeof(p->v),'') <> 'object' then p := jsonb_set(p, array[v], '{}'); end if;
  if on_ then p := jsonb_set(p, array[v, sp], jsonb_build_object('by', auth.uid(), 'at', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  else p := jsonb_set(p, array[v], (p->v) - sp); if (p->v) = '{}'::jsonb then p := p - v; end if; end if;
  update public.rc_profiles set data = jsonb_set(coalesce(data,'{}'), '{pro}', p), updated_at = now() where id = target;
  return p;
end $$;
revoke execute on function public.rc_set_pro(uuid, text, text, boolean) from public, anon;
grant execute on function public.rc_set_pro(uuid, text, text, boolean) to authenticated;
