alter table public.combat_encounters
	add column if not exists enemy_player_name text;
