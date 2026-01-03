-- Create table for storing player profiles (auth & rating)
create table public.players (
  id text not null,
  username text unique,
  password text, -- hashed or plain for simple proto (we'll assume plain/simple hash logic in server)
  rating integer not null default 1000,
  matches_played integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint players_pkey primary key (id)
);

-- Create table for storing player sessions
create table public.player_sessions (
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
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint player_sessions_pkey primary key (id),
  constraint player_sessions_player_id_key unique (player_id)
);

-- Table to store player teams ("ghosts") for combat simulation against other players
create table public.ghosts (
  id uuid not null default gen_random_uuid(),
  player_id text not null,
  round integer not null,
  -- Serialized JSON of the team (units, items, position)
  team_composition jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint ghosts_pkey primary key (id)
);
-- Index for quick lookup of ghosts by round
create index ghosts_round_idx on public.ghosts (round);

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
