# quests

Just like in wc3, quests are a way to give the player a goal to achieve. They
are usually given by NPCs, but can also be given by items or other events. We
can have a tab in the top bar that shows the current quests, and when you click
on one, it shows the description and the current progress.

# log

The log is a way to show the player what happened in the past:

- what quests were completed
- what items were picked up
- what items were dropped
- what items were crafted
- etc

- unit perks:
  - concentration: if not being attacked, the unit deals more damage
  - evasion: the unit has a higher chance to dodge attacks

- pool:
- heroes are unique, and once hired they are only available if dismissed
- then other players can hire that hero
- the number of items is also limited and shared, in the same way as heroes

turn every action type into a gimmick:

- on buy/sell item
- unit to the left/right/top/bottom of this
- on visit merchant/encounter/trainer
- on recruit/dismiss
- on start/end of fight
- on start/end of turn
- on poison/burn/bleed/freeze/haste/slow
- on heal/damage/crit/block/dodge/parry
- on doing x n times

targeting:

- unit to the left/right/top/bottom of this
- units around this
- all units
- all units of type
- all units of faction
- all units of class
- leftmost/rightmost unit
- isolated unit
- unit with lowest/highest hp/attack/defense/speed

do something based on another value:

- gain x as a percentage/double of y

stats that can be buffed:

- hp/attack/defense/speed
- sell price
- cri/dodge/parry/block chance

level up skills

- gain x income

merchants based on attributes

- sell economy/heal/attack/defense/speed items

create combinations with the events above:

- eg.: on x, the y something gets z

- allow learning skill on encounter reward

Inspiration for traits:

- diablo 3 talents
- the bazaar talents

Give every unit a random personality trait?

Besides having the units, the player also controls a guild hall (buying
upgrades, upgrading the guild hall, etc). The guild hall is a place where the
player can recruit units, buy items, and upgrade their units.

player has a limited number of rooms, and needs to choose:

- library: makes it easier to learn skills
- training room: makes it easier to level up
- armory: makes it easier to upgrade items
- tavern: makes it easier to recruit units
- workshop: makes it easier to craft items
- alchemy lab: makes it easier to brew potions
- arena: makes it easier to train units
- market: makes it easier to buy/sell items
- shrine: makes it easier to learn skills
- forge: makes it easier to upgrade items
- temple: makes it easier to brew potions

Create events based on party composition:

- hunter: gather healing herbs
- monk: meditate

Display possible loot when selecting quest

Loop: loot during the week, pvp on weekend

Units with professions can give items per day/week

Loot: in the bazaar, the player gains hp/regen/shield
for this game, the units do
and for some effects, the items
Examples:
regen -> unit
poison -> weapon

https://thebazaar.wiki.gg/wiki/Loot_Items

cinders -> burn
talisman -> unit
extract (poison) -> item
chocolate bars -> unit (+hp)

card ideas
- +x attack when hurt


- diablo-style items
- sword -> sword of the whale (+hp), sword of the tiger (+attack), red sword of the tiger (+agi, +attack)

unicorn overlord allows setting some basic ai:
- priority #1, 2 and 3
- target (lower hp, higher atk)
- if /else (eg. heal, if hp < 50%)

- make projectils use speed

- item slots: valve artifact had 3 slots per hero, displayed on top
item ideas:
- 20pct cooldown
- add 20pct cooldown, gain atk/hp

todo: check artifact's item list

rogue - fast atk (2s)
rogue2 - gains +10% crit on every other attack

skill ideas:
- chain lightning (does damage to 3 units)
- fire wall (does damage to all units in a column)
- fireball (does damage to all enemy units in a row)
- time stop (stops time for 2s)

selling: tavern icon
when the player starts dragging, highlight icon and display ("sell")

meta-progression:
- gain cosmetic items to place in the side of the board

Display victory stars  
Hearts for lives


Guildmaster:
- is the leader of the guild, the "player"
- adds some bonuses to the heroes


start: 2 heroes + 1 item

waves can give multiple rewards:
- hero
- item
- gold

losing a battle makes the player lose prestige
prestige can be reacquired by winning battles
prestige can be used to buy stuff or reroll

-bleed
-poison
-burn
1s ticks
