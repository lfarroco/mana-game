-- Function to increment rating securely
create or replace function increment_rating(player_id text, amount int)
returns void
language plpgsql
security definer
as $$
begin
  update public.players
  set rating = rating + amount,
      matches_played = matches_played + 1
  where id = player_id;
end;
$$;
