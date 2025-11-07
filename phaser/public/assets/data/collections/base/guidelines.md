All cards are balanced and can be 'good' depending on the situation
Each card has a 'base' of 10dps
So a 20 damage card should have a 2000ms cooldown
Each second of haste equals 5dps - over 2s, a unit will deal 20 damage (10 + 2 x 5)
In the same way, each second of slow equals defensive 5dps
Shields has a bonus (15 per second), because there are counters
The power can be balanced by adjusting the cooldown: 30pow -> 3s, 100pow->10s
The only valid forms of enemy unit targeting are 'all_enemies' and 'random_enemy'
When targeting allies, 'adjacent_allies' (4 targets) and 'all_allies' (9 targets) are more expensive
The next most expensive are 'same_row_allies' and 'same_column_allies', as they target up to 2 allies
Other allied targeting options (left/right/front/back/self) can target up to 1 ally, so they are considered cheaper
So a card that reacts to 'same_row_allies', can receive up to 10dps each time all 2 allies perform
Reactions to all enemies/allies should provide little 1/8 of the base dps
The same ratios should be respected for units that concede bonuses when they perform
Actions that can be reacted: damage, heal, shield, haste, slow
Charge can't be reacted to
Charge, slow and haste all operate on a 1000ms scale
no unit can have cooldown lower than 1000ms - even with effects, the game will cap it
To avoid loops like 'on heal, damage' and "on damage, heal" effects have an end goal of adding power
Self-reactions are not necessary - use a regular trait instead. instead of 'on damage, slow', use just a slow trait
Units should have traits based on their position. Traits that trigger on 'all allies/enemies' are not only powerful,
but trivialize positioning strategy. Instead, use 'same row/column' or 'front/etc' targeting.
Only exception are cores.