All cards are balanced and can be 'good' depending on the situation
Each card has a 'base' of 10dps
So a 20 damage card should have a 2000ms cooldown
Each second of haste equals 5dps - over 1s, the unit will charge 1.5s
In the same way, each second of slow equals defensive 5dps
Shield has a bonus, because it can be countered
Each 1s for a shield card yields 12 shield
The power can be balanced by adjusting the cooldown
The only valid forms of enemy targeting are 'all_enemies' and 'random_enemy'
When targeting allies, 'adjacent_allies' (4 targets) and 'all_allies' (9 targets) are more expensive
The next most expensive are 'same_row_allies' and 'same_column_allies', as they target up to 2 allies
Other allied targeting options (left/right/front/back/self) can target up to 1 ally, so they are considered cheaper
So a card that reacts to 'same_row_allies', can receive up to 10dps each time all 2 allies perform
Reactions to all enemies/allies should provide little 1/8 of the base dps
The same ratios should be respected for units that concede bonuses when they perform
Actions that can be reacted: damage, heal, shield, haste, slow
Charge can't be reacted to
charge, slow and haste all operate on a 1000ms scale
no unit can have cooldown lower than 1000ms - even with effects, the game will cap it
Avoid 'on heal, heal' effects and variation - instead, use 'on x,  power boost'
self-reactions are not necessary - use a regular trait instead. instead of 'on damage, slow', use just a slow trait
