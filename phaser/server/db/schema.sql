-- Create table for storing player sessions
create table public.player_sessions (
  id uuid not null default gen_random_uuid (),
  player_id text not null,
  phase text not null default 'encounter',
  round integer not null default 1,
  current_options jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint player_sessions_pkey primary key (id),
  constraint player_sessions_player_id_key unique (player_id)
);

-- Add simple RLS policies (though server uses service role usually)
alter table public.player_sessions enable row level security;

create policy "Allow all access for everyone (for now)" on public.player_sessions
  for all using (true) with check (true);
