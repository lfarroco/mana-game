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


charge mechanics:
healer: when an ally is attacked, charge 1 (heal)
protector: when an ally is attacked, charge 1 (taunt)
when an ally attacks, charge 1
when an ally heals, charge 1
when an ally crits, charge 1

deepseek conversation with name ideas:
https://chat.deepseek.com/a/chat/s/6cd0f7f9-a35a-48c2-878e-07e5eb120a4c

relic ideas:
- enchant random card with x (multicast, fiery, cold, etc)

- cards that get stronger when another card is sold
- cads that consume other cards (like HS demons)

- Flanking Bonus. If two melee units attack the same target from columns C–1 and C+1, grant them each +10% Attack vs that target.
- this helps with melee units alone in the front. They take extra damage from the sideways units.
keyword brainstorming session: https://chatgpt.com/c/685e9b20-7698-8004-9b7b-dd36b947842c


sacrifice cooldown for damage: add damage, but increaases cooldown

damage display: aim to the center, randomize away from last 5 hits


vanessa weapons

bayonet - when left wp used, deal 10,15... (piggyback)
blowgun - 2, + poison = dmg, 9s
bolas - 40, slow 1 for 2s, 5s, 2 ammo
butterfly - 5 , multicast - 8s
calico - 10, use another weap +10 crit, 7s
dagger - 30, 1g - 9s
hook - 12, slow 1 - 7s
granade - 50, 25% crit, 5s, 1 ammo
handaxe - 10, weapons have + 6, 8s
honing steel - the right wp gains 8, 12
ice pick - 25, freeze 1s, when you freeze +15
illusoray - slow 1, for each surrounding friend or ray, +1 multi
jitte - 10, slow 1, when slow +10, 6s
lighter, burn 2 , 3s
shrimp - 20, burn 2, when slow +10 and +2 burn, 9s
mr richardson - shield 10, when haste or slow, +5shield
narwhal - 10, 4s
old saltclaw - 10, when haste or slow, +5
pearl - shield 10, when use aqua, charge 1, 5s
pesky pete - burn 4, each adjc (tribe1,2) +1 multicast
pet rock - 8, only friend, 10 crit - 6s
piranha - 6, 20 crit, double crit, 6s
shoe blade - 20, 15 crit, 7s
switchblade - 30, use adj weap, it gains +3 - 9s
throwing knife - 33, when crit, charge 1, 4s - 3 ammo
