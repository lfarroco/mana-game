import { CardCollection, CardDefinition } from "@Models/Entities/Card";
import { Effect, EffectId, EffectReaction, EffectSourcePosition, Targeting } from "TriggerSystem/TriggerSystem";

const regen: Effect = { id: "regen" };
const damage: Effect = { id: "damage" };
const heal: Effect = { id: "heal" };
const shield: Effect = { id: "shield" };
const poison: Effect = { id: "poison" };
const haste = (duration: number, targets: Targeting): Effect => ({ id: "haste", duration, targets });
const slow = (duration: number, targets: Targeting): Effect => ({ id: "slow", duration, targets });
const charge = (duration: number, targets: Targeting): Effect => ({ id: "charge", duration, targets });
const column: Targeting = { id: "column_allies" };
const row: Targeting = { id: "row_allies" };
const randomAlly = (count: number): Targeting => ({ id: "random_ally", count });
const randomEnemy = (count: number): Targeting => ({ id: "random_enemy", count });
const trigger: Targeting = { id: "trigger" };
const self: Targeting = { id: "self" };
const increasePower = (amount: number, targets: Targeting, permanent: boolean = false): Effect => ({ id: "increase_power", "amount": amount, permanent, "targets": targets });
const increaseCritical = (amount: number, targets: Targeting): Effect => ({ id: "increase_critical", amount, targets });
const reaction = (effect: EffectId | "all", position: EffectSourcePosition, reactWith: Effect): EffectReaction => ({
	position,
	effectId: effect,
	effects: [
		reactWith
	]
})

const left: Targeting = { id: "left_ally" };
const right: Targeting = { id: "right_ally" };
const top: Targeting = { id: "top_ally" };
const bottom: Targeting = { id: "bottom_ally" };
const weakestAlly: Targeting = { id: "weakest_ally" };

const cards: CardDefinition[] = [
	{
		id: "mana_crystal",
		pic: "blue-stone",
		life: 500,
		power: 10,
		cooldown: 5200,
		isCore: true,
		effects: [
			regen,
			increasePower(5, column),
		],
		reactions: [
			reaction("all", "row_allies", charge(500, self)),
		]
	},
	{
		id: "critical_crystal",
		pic: "red-stone",
		life: 500,
		power: 15,
		cooldown: 5200,
		isCore: true,
		effects: [
			damage,
			increaseCritical(5, column),
		],
		reactions: [
			reaction("all", "row_allies", increasePower(5, column)),
		]
	},
	{
		id: "protective_crystal",
		pic: "yellow-stone",
		life: 600,
		power: 10,
		cooldown: 4500,
		isCore: true,
		reflect: 15,
		effects: [
			shield,
			increasePower(5, randomAlly(1), true),
		],
		reactions: [
			reaction("all", "row_allies", increasePower(5, trigger)),
		]
	},
	{
		id: "growth_crystal",
		pic: "green-stone",
		life: 500,
		power: 15,
		cooldown: 5000,
		isCore: true,
		effects: [
			heal,
			increasePower(1, column, true),
		],
		reactions: [
			reaction("all", "row_allies", increasePower(1, trigger, true)),
		]
	},
	{
		id: "purple_crystal",
		pic: "purple-stone",
		life: 500,
		power: 20,
		cooldown: 5500,
		isCore: true,
		effects: [
			poison,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("slow", "allies", increasePower(5, trigger, true)),
		]
	},
	{
		id: "void_witch",
		pic: "boss_andromeda",
		power: 20,
		cooldown: 5400,
		effects: [
			poison,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("slow", "allies", increasePower(5, self)),
		]
	},
	{
		id: "living_armor",
		pic: "f1_tank",
		power: 35,
		cooldown: 5100,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "column_allies", increasePower(5, trigger)),
		]
	},
	{
		id: "thunder_mech",
		pic: "f3_mech",
		power: 20,
		cooldown: 5200,
		effects: [
			damage
		],
		reactions: [
			reaction("haste", "allies", increaseCritical(5, self)),
		]
	},
	{
		id: "timebender",
		pic: "boss_spelleater",
		power: 15,
		cooldown: 5000,
		effects: [
			shield,
			increasePower(1, randomAlly(1), true),
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, row)),
		]
	},
	{
		id: "tek_monk",
		pic: "f3_windgiver",
		power: 20,
		cooldown: 4600,
		effects: [
			damage,
			increasePower(1, self, true),
		],
		reactions: [
			reaction("heal", "column_allies", charge(500, self)),
		]
	},
	{
		id: "void_specter",
		pic: "neutral_amu",
		power: 15,
		cooldown: 5200,
		effects: [
			poison
		],
		reactions: [
			reaction("regen", "enemies", increasePower(2, self)),
		]
	},
	{
		id: "plaguebearer",
		pic: "f3_plague_totem",
		power: 15,
		cooldown: 3800,
		effects: [
			poison
		],
		reactions: [
			reaction("regen", "allies", increasePower(5, self)),
		]
	},
	{
		id: "toxic_alchemist",
		pic: "f5_drogon",
		power: 20,
		cooldown: 5200,
		effects: [
			poison,
			increaseCritical(5, column),
		],
		reactions: [
			reaction("regen", "enemies", increasePower(5, self)),
		]
	},
	{
		id: "venomous_viper",
		pic: "neutral_serpenti",
		power: 20,
		cooldown: 5200,
		effects: [
			poison
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, self)),
		]
	},
	{
		id: "noxious_blight",
		pic: "neutral_dreamgazer",
		power: 30,
		cooldown: 4300,
		effects: [
			poison,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("poison", "allies", haste(1000, self)),
		]
	},
	{
		id: "corrosive_slime",
		pic: "f4_gloomchaser",
		power: 20,
		cooldown: 4300,
		effects: [
			poison
		],
		reactions: [
			reaction("shield", "enemies", increasePower(5, self)),
		]
	},
	{
		id: "infected_horror",
		pic: "f4_horror",
		power: 30,
		cooldown: 5700,
		effects: [
			poison
		],
		reactions: [
			reaction("poison", "allies", increasePower(5, self)),
		]
	},
	{
		id: "skeletal_mage",
		pic: "neutral_bonereaper",
		power: 40,
		cooldown: 4900,
		effects: [
			poison
		],
		reactions: [
			reaction("poison", "allies", increasePower(5, trigger)),
		]
	},
	{
		id: "scourge_bringer",
		pic: "f4_nocturn",
		power: 20,
		cooldown: 5500,
		effects: [
			poison,
			haste(1000, column),
		],
		reactions: [
			reaction("poison", "column_allies", increasePower(5, trigger)),
		]
	},
	{
		id: "diana",
		pic: "neutral_arrowwhistler",
		power: 30,
		cooldown: 5600,
		effects: [
			damage
		],
		reactions: [
			reaction("shield", "allies", haste(1000, self)),
		]
	},
	{
		id: "moss_golem",
		pic: "neutral_golemnature",
		power: 30,
		cooldown: 5200,
		effects: [
			shield,
			increasePower(1, randomAlly(1), true),
		],
		reactions: [
			reaction("regen", "column_allies", increasePower(5, self)),
		]
	},
	{
		id: "stone_guardian",
		pic: "neutral_golemstone",
		power: 20,
		cooldown: 4500,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "allies", increasePower(3, self, true)),
		]
	},
	{
		id: "shadow_assassin",
		pic: "boss_shadowlord",
		power: 10,
		"critical": 20,
		cooldown: 4300,
		effects: [
			damage,
			increaseCritical(5, self),
		],
		reactions: [
			reaction("heal", "enemies", increasePower(5, self)),
		]
	},
	{
		id: "quickstone",
		pic: "haste-stone",
		life: 500,
		power: 15,
		cooldown: 4500,
		isCore: true,
		effects: [
			haste(1000, row),
			regen
		],
		reactions: [
			reaction("all", "row_allies", charge(500, column)),
		]
	},
	{
		id: "commander",
		pic: "f1_shieldforger",
		power: 30,
		cooldown: 6000,
		effects: [
			shield,
			increasePower(5, column),
			increasePower(5, row),
		],
		reactions: []
	},
	{
		id: "avatar_of_anger",
		pic: "f2_chakriavatar",
		power: 20,
		critical: 10,
		cooldown: 5000,
		effects: [
			damage,
			increasePower(1, self, true),
		],
		reactions: [
			reaction("damage", "column_allies", increasePower(5, self)),
		]
	},
	{
		id: "chaos_knight",
		pic: "boss_chaosknight",
		power: 30,
		cooldown: 5500,
		effects: [
			damage,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("shield", "enemies", increasePower(5, self)),
		]
	},
	{
		id: "thunder_conduit",
		pic: "boss_borealjuggernaut",
		power: 30,
		cooldown: 6200,
		effects: [
			damage
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, self)),
		]
	},
	{
		id: "arbiter",
		pic: "f1_peacekeeper",
		power: 20,
		cooldown: 5200,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "enemies", increasePower(5, self)),
		]
	},
	{
		id: "bastion",
		pic: "f1_mech",
		power: 20,
		cooldown: 4200,
		effects: [
			shield
		],
		reactions: [
			reaction("heal", "left_ally", increasePower(10, column)),
		]
	},
	{
		id: "aegis_warden",
		pic: "f2_demononi",
		power: 25,
		cooldown: 5100,
		effects: [
			shield
		],
		reactions: [
			reaction("poison", "column_allies", increasePower(5, trigger)),
		]
	},
	{
		id: "bulwark",
		pic: "f1_solarius",
		power: 20,
		cooldown: 4400,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "row_allies", increasePower(5, column)),
		]
	},
	{
		id: "void_shield",
		pic: "neutral_voidhunter",
		power: 20,
		cooldown: 4800,
		effects: [
			shield
		],
		reactions: [
			reaction("shield", "column_allies", increasePower(5, row)),
		]
	},
	{
		id: "fortress",
		pic: "boss_city",
		power: 20,
		cooldown: 5200,
		effects: [
			shield
		],
		reactions: [
			reaction("shield", "allies", increasePower(5, left)),
		]
	},
	{
		id: "parry_master",
		pic: "neutral_swordofakrane",
		power: 20,
		cooldown: 5800,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "enemies", increasePower(2, column)),
		]
	},
	{
		id: "cleric",
		pic: "neutral_healingmystictwitch",
		power: 20,
		cooldown: 4100,
		effects: [
			heal
		],
		reactions: [
			reaction("damage", "row_allies", increasePower(5, trigger)),
		]
	},
	{
		id: "battle_medic",
		pic: "neutral_healingmysticbandainamco",
		power: 35,
		cooldown: 6800,
		effects: [
			heal,
			increaseCritical(5, right),
		],
		reactions: [
			reaction("shield", "column_allies", charge(500, self)),
		]
	},
	{
		id: "light_priestess",
		pic: "neutral_healingmystic",
		power: 25,
		cooldown: 5700,
		effects: [
			heal
		],
		reactions: [
			reaction("shield", "row_allies", increasePower(1, top, true)),
		]
	},
	{
		id: "soul_weaver",
		pic: "boss_soulstealer",
		power: 15,
		cooldown: 4700,
		effects: [
			heal,
			increasePower(1, bottom, true),
		],
		reactions: [
			reaction("shield", "row_allies", increasePower(5, trigger)),
		]
	},
	{
		id: "mender_of_worlds",
		pic: "f6_auroraguardian",
		power: 35,
		cooldown: 6200,
		effects: [
			heal,
			increasePower(1, left, true),
		],
		reactions: [
			reaction("all", "column_allies", haste(1000, self)),
		]
	},
	{
		id: "divine_spark",
		pic: "f3_obelyskduskwind",
		power: 35,
		cooldown: 4200,
		effects: [
			heal
		],
		reactions: [
			reaction("all", "column_allies", haste(1000, row)),
		]
	},
	{
		id: "radiance_envoy",
		pic: "boss_cindera",
		power: 30,
		cooldown: 5700,
		effects: [
			heal
		],
		reactions: [
			reaction("all", "row_allies", haste(1000, column)),
		]
	},
	{
		id: "harmony_monk",
		pic: "boss_harmony",
		power: 20,
		cooldown: 4800,
		effects: [
			heal
		],
		reactions: [
			reaction("all", "row_allies", increasePower(5, column)),
		]
	},
	{
		id: "oracle",
		pic: "neutral_timekeeper",
		power: 30,
		cooldown: 3300,
		effects: [
			heal
		],
		reactions: [
			reaction("all", "left_ally", increaseCritical(10, right)),
		]
	},
	{
		id: "chronomancer",
		pic: "f4_klaxon",
		power: 20,
		cooldown: 3700,
		effects: [
			regen
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, self)),
		]
	},
	{
		id: "spirit_of_the_forest",
		pic: "boss_crystal",
		power: 30,
		cooldown: 4800,
		effects: [
			regen,
			haste(1000, row),
		],
		reactions: [
			reaction("all", "column_allies", increaseCritical(5, column)),
		]
	},
	{
		id: "enchanted_tree",
		pic: "f6_treant",
		power: 10,
		cooldown: 2300,
		effects: [
			regen
		],
		reactions: [
			reaction("all", "row_allies", increasePower(1, self, true)),
		]
	},
	{
		id: "castle_vampire",
		pic: "boss_vampire",
		power: 20,
		cooldown: 2900,
		effects: [
			regen,
			increaseCritical(5, self),
		],
		reactions: [
			reaction("damage", "column_allies", increasePower(5, self)),
		]
	},
	{
		id: "plague_dr",
		pic: "f4_plaguedr",
		power: 20,
		cooldown: 2900,
		effects: [
			regen,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("poison", "column_allies", increasePower(5, self)),
		]
	},
	{
		id: "eternal_phoenix",
		pic: "f2_firewyrm",
		power: 20,
		cooldown: 4300,
		effects: [
			regen
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, weakestAlly)),
		]
	},
	{
		id: "sand_shifter",
		pic: "f3_sandhowler",
		power: 30,
		cooldown: 5800,
		effects: [
			regen
		],
		reactions: [
			reaction("slow", "column_allies", charge(500, self)),
		]
	},
	{
		id: "crystalline_geode",
		pic: "f6_crystalbeetle",
		power: 40,
		cooldown: 4200,
		effects: [
			regen
		],
		reactions: [
			reaction("regen", "allies", increaseCritical(5, self)),
		]
	},
	{
		id: "blood_catalyst",
		pic: "neutral_bloodletter",
		power: 20,
		cooldown: 4200,
		effects: [
			regen
		],
		reactions: [
			reaction("heal", "allies", increasePower(1, self, true)),
		]
	},
	{
		id: "symbiote",
		pic: "f5_mech",
		power: 20,
		cooldown: 4500,
		effects: [
			regen,
			haste(1000, left),
		],
		reactions: [
			reaction("shield", "row_allies", increasePower(5, column)),
		]
	},
	{
		id: "time_shifter",
		pic: "f1_sister",
		power: 15,
		cooldown: 6500,
		effects: [
			shield,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, column)),
		]
	},
	{
		id: "time_magus",
		pic: "f2_mage4winds",
		power: 10,
		cooldown: 4900,
		effects: [
			damage,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, column)),
		]
	},
	{
		id: "mana_source",
		pic: "f4_furosa",
		power: 20,
		cooldown: 5000,
		effects: [
			regen,
			haste(2000, row),
		],
		reactions: [
			reaction("all", "row_allies", charge(500, self)),
		]
	},
	{
		id: "void_spawn",
		pic: "f5_ankylos",
		power: 25,
		cooldown: 4800,
		effects: [
			poison,
			haste(2000, column),
		],
		reactions: [
			reaction("poison", "allies", charge(500, self)),
		]
	},
	{
		id: "arcane_anomaly",
		pic: "f6_myriad",
		power: 15,
		cooldown: 5500,
		effects: [
			damage,
			charge(1000, column),
		],
		reactions: [
			reaction("shield", "column_allies", charge(500, self)),
		]
	},
	{
		id: "mirror_entity",
		pic: "f3_nimbus",
		power: 20,
		cooldown: 4000,
		effects: [
			shield
		],
		reactions: [
			reaction("all", "bottom_ally", increasePower(10, top)),
		]
	},
	{
		id: "spellbreaker",
		pic: "neutral_spelljammer",
		power: 10,
		cooldown: 4500,
		effects: [
			damage,
			haste(1000, row),
		],
		reactions: [
			reaction("poison", "allies", haste(1000, randomAlly(1))),
		]
	},
	{
		id: "duelist",
		pic: "neutral_shuffler",
		power: 20,
		cooldown: 4500,
		effects: [
			damage
		],
		reactions: [
			reaction("damage", "enemies", increasePower(4, self)),
		]
	},
	{
		id: "gambler",
		pic: "neutral_gambler",
		power: 10,
		cooldown: 4200,
		effects: [
			shield,
			increaseCritical(5, column),
		],
		reactions: [
			reaction("all", "row_allies", increaseCritical(5, randomEnemy(1))),
		]
	},
	{
		id: "glass_cannon",
		pic: "f1_sinergyunit",
		power: 30,
		cooldown: 4100,
		effects: [
			damage,
			increaseCritical(5, self),
		],
		reactions: [
			reaction("shield", "allies", increasePower(5, self)),
		]
	},
	{
		id: "spellblade",
		pic: "f1_rightfulheir",
		power: 30,
		cooldown: 4100,
		effects: [
			damage
		],
		reactions: [
			reaction("all", "row_allies", increaseCritical(5, self)),
		]
	},
	{
		id: "berserker",
		pic: "neutral_beastmaster",
		power: 40,
		cooldown: 5200,
		effects: [
			damage
		],
		reactions: [
			reaction("damage", "enemies", haste(1000, self)),
		]
	},
	{
		id: "gunslinger",
		pic: "neutral_hsuku",
		power: 20,
		cooldown: 5000,
		effects: [
			damage,
			charge(500, column),
		],
		reactions: [
			reaction("shield", "column_allies", charge(500, self)),
		]
	},
	{
		id: "inquisitor",
		pic: "neutral_inquisitorkron",
		power: 20,
		cooldown: 4800,
		effects: [
			damage,
			charge(500, left),
		],
		reactions: [
			reaction("poison", "enemies", increasePower(2, self, true)),
		]
	},
	{
		id: "grove_guardian",
		pic: "neutral_keeperofthevale",
		power: 20,
		cooldown: 4800,
		effects: [
			regen,
			charge(500, right),
		],
		reactions: [
			reaction("damage", "enemies", increasePower(4, right)),
		]
	},
	{
		id: "thunder_core",
		pic: "neutral_emp",
		power: 30,
		"rank": 2,
		cooldown: 5800,
		effects: [
			damage,
			charge(1000, left),
		],
		reactions: [
			reaction("haste", "column_allies", increasePower(6, self, true)),
		]
	},
	{
		id: "conduit_howler",
		pic: "neutral_exun",
		power: 30,
		"rank": 2,
		cooldown: 4800,
		effects: [
			shield,
			haste(2000, column),
		],
		reactions: [
			reaction("haste", "row_allies", increasePower(4, column, true)),
		]
	},
	{
		id: "water_elemental",
		pic: "neutral_fog",
		power: 30,
		"rank": 2,
		cooldown: 5800,
		effects: [
			heal,
			charge(1000, column),
		],
		reactions: [
			reaction("regen", "row_allies", increasePower(6, trigger, true)),
		]
	},
	{
		id: "master_of_thorns",
		pic: "neutral_geargrinder",
		power: 30,
		"rank": 2,
		cooldown: 7800,
		effects: [
			poison
		],
		reactions: [
			reaction("damage", "enemies", increasePower(5, self)),
		]
	},
	{
		id: "coral_builder",
		pic: "neutral_giantcrab",
		power: 30,
		"rank": 2,
		cooldown: 5800,
		effects: [
			regen,
			haste(2000, column),
		],
		reactions: [
			reaction("shield", "allies", increasePower(5, self)),
		]
	},
	{
		id: "toxicologist",
		pic: "neutral_gnasher",
		power: 40,
		"rank": 3,
		cooldown: 6800,
		effects: [
			poison,
			slow(2000, randomEnemy(2)),
		],
		reactions: [
			reaction("poison", "allies", increasePower(6, self)),
		]
	},
	{
		id: "expedition_leader",
		pic: "neutral_goldenhammer",
		power: 30,
		"rank": 3,
		cooldown: 7300,
		effects: [
			shield,
			increasePower(10, column),
		],
		reactions: [
			reaction("heal", "allies", increasePower(4, column))
		]
	},
	{
		id: "vanguard",
		pic: "neutral_gauntletmaster",
		power: 40,
		"rank": 3,
		cooldown: 4300,
		effects: [
			damage,
			haste(2000, column),
		],
		reactions: [
			reaction("haste", "allies", increasePower(5, self, true)),
		]
	},
	{
		id: "veteran_paladin",
		pic: "neutral_goldenjusticar",
		power: 40,
		"rank": 3,
		cooldown: 5400,
		effects: [
			regen
		],
		reactions: [
			reaction("shield", "column_allies", increasePower(5, self, true))
		]
	},
	{
		id: "webert_the_old",
		pic: "neutral_goldenmantella",
		power: 40,
		"rank": 3,
		cooldown: 7400,
		effects: [
			heal,
			increasePower(20, row),
		],
		reactions: [
			reaction("regen", "column_allies", increasePower(5, row, true)),
		]
	}
]

export const BASE_COLLECTION_DATA: CardCollection = {
	id: "base",
	"name": "Base Set",
	"cards": cards
}