alter table public.ghosts
	add column if not exists player_name text;

update public.ghosts ghosts
set player_name = coalesce(nullif(btrim(ghosts.player_name), ''), nullif(btrim(players.username), ''), 'Guest')
from public.players players
where ghosts.player_id = players.id
	and (ghosts.player_name is null or btrim(ghosts.player_name) = '');

update public.ghosts
set player_name = 'Guest'
where player_name is null
	or btrim(player_name) = '';

alter table public.ghosts
	alter column player_name set default 'Guest',
	alter column player_name set not null;
