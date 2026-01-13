-- Create table for storing player profiles (auth & rating)
create table if not exists public.players (
  id text not null,
  username text unique,
  password text,
  rating integer not null default 1000,
  matches_played integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint players_pkey primary key (id)
);

-- Ensure columns exist (Migration Safe)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'players' and column_name = 'username') then
    alter table public.players add column username text unique;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'players' and column_name = 'rating') then
    alter table public.players add column rating integer not null default 1000;
  end if;
end $$;

-- Grants (Critical for Triggers/API)
grant all on table public.players to postgres, service_role;
grant select, update, insert on table public.players to anon, authenticated;

-- Create table for storing player sessions
create table if not exists public.player_sessions (
  id uuid not null default gen_random_uuid (),
  player_id text not null,
  phase text not null default 'encounter',
  round integer not null default 1,
  -- Step in the current round (usually 1, 2, 3 before combat)
  step integer not null default 1,
  -- RNG Seed for deterministic generation
  seed text not null default '',
  initial_seed text not null default '',
  action_log jsonb not null default '[]'::jsonb,
  current_options jsonb,
  wins integer not null default 0,
  losses integer not null default 0,
  team jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint player_sessions_pkey primary key (id),
  constraint player_sessions_player_id_key unique (player_id)
);

-- Table to store player teams ("ghosts") for combat simulation against other players
create table if not exists public.ghosts (
  id uuid not null default gen_random_uuid(),
  player_id text not null,
  round integer not null,
  -- Serialized JSON of the team (units, items, position)
  team_composition jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint ghosts_pkey primary key (id)
);
-- Index for quick lookup of ghosts by round
create index if not exists ghosts_round_idx on public.ghosts (round);

-- Add simple RLS policies (though server uses service role usually)
alter table public.player_sessions enable row level security;
alter table public.ghosts enable row level security;
alter table public.players enable row level security;

create policy "Allow all access for everyone (for now)" on public.player_sessions
  for all using (true) with check (true);

create policy "Allow all access for everyone (for now)" on public.ghosts
  for all using (true) with check (true);

create policy "Allow all access for everyone (for now)" on public.players
  for all using (true) with check (true);

-- Functions
create or replace function increment_rating(player_id text, amount int)
returns void
language plpgsql
as $$
begin
  update public.players
  set rating = rating + amount,
      matches_played = matches_played + 1
  where id = player_id;
end;
$$;

-- Trigger to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.players (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

-- trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
