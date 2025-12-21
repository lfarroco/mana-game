import { CardCollection, CardDefinition } from "@Models/Entities/Card";
import { Effect, EffectId, EffectReaction, EffectSourcePosition, Targeting } from "TriggerSystem/TriggerSystem";

// Refer to the Readme for instructions on how to balance units

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
const decreasePower = (amount: number, targets: Targeting, permanent: boolean = false): Effect => ({ id: "decrease_power", amount, permanent, "targets": targets });
const increaseCritical = (amount: number, targets: Targeting): Effect => ({ id: "increase_critical", amount, targets });
const reaction = (effect: EffectId | "all", position: EffectSourcePosition, reactWith: Effect): EffectReaction => ({
	position,
	effectId: effect,
	effects: [
		reactWith
	]
})
const multiplyPower = (multiplier: number, targets: Targeting): Effect => ({ id: "multiply_power", multiplier, targets });

const left: Targeting = { id: "left_ally" };
const right: Targeting = { id: "right_ally" };
const top: Targeting = { id: "top_ally" };
const bottom: Targeting = { id: "bottom_ally" };
const weakestAlly: Targeting = { id: "weakest_ally" };
const strongestEnemy: Targeting = { id: "strongest_enemy" };
const strongestAlly: Targeting = { id: "strongest_ally" };
const weakestEnemy: Targeting = { id: "weakest_enemy" };
const allAllies: Targeting = { id: "all_allies", ofType: "any" };
const allAlliesOfType = (ofType: "damage" | "heal" | "shield" | "poison" | "regen"): Targeting => ({ id: "all_allies", ofType });
// const allEnemies: Targeting = { id: "enemies" };

const distributePower = (targets: Targeting): Effect => ({ id: "distribute_power", targets });
const absorbPower = (targets: Targeting): Effect => ({ id: "absorb_power", targets });
//const decreasePower = (percentage: number, targets: Targeting, permanent: boolean = false): Effect => ({ id: "decrease_power", percentage, targets, permanent });

const cards: CardDefinition[] = [
	{
		id: "mana_crystal",
		pic: "blue-stone",
		life: 500,
		power: 35,
		cooldown: 5200,
		isCore: true,
		effects: [
			regen,
			increasePower(10, column),
		],
		reactions: [
			reaction("all", "row_allies", charge(500, self)),
		]
	},
	{
		id: "critical_crystal",
		pic: "red-stone",
		life: 500,
		power: 35,
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
		power: 35,
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
		power: 35,
		cooldown: 4500,
		isCore: true,
		effects: [
			heal,
			increasePower(2, column, true),
		],
		reactions: [
			reaction("all", "row_allies", increasePower(5, trigger)),
		]
	},
	{
		id: "purple_crystal",
		pic: "purple-stone",
		life: 500,
		power: 40,
		cooldown: 4700,
		isCore: true,
		effects: [
			poison,
			slow(1000, randomEnemy(1)),
		],
		reactions: [
			reaction("slow", "allies", increasePower(4, trigger, true)),
		]
	},
	{
		id: "quickstone",
		pic: "haste-stone",
		life: 500,
		power: 48,
		cooldown: 5200,
		isCore: true,
		effects: [
			regen,
			haste(1000, row),
		],
		reactions: [
			reaction("all", "row_allies", charge(500, column)),
		]
	},
	{
		id: "void_witch",
		pic: "boss_andromeda",
		power: 50,
		cooldown: 5400,
		effects: [
			poison,
			slow(1000, randomEnemy(1)),
		],
		reactions: []
	},
	{
		id: "living_armor",
		pic: "f1_tank",
		power: 30,
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
		power: 40,
		cooldown: 5200,
		effects: [
			damage
		],
		reactions: [
			reaction("haste", "row_allies", increaseCritical(5, self)),
		]
	},
	{
		id: "timebender",
		pic: "boss_spelleater",
		power: 45,
		cooldown: 5000,
		effects: [
			shield,
			increasePower(2, randomAlly(1), true),
		],
		reactions: []
	},
	{
		id: "tek_monk",
		pic: "f3_windgiver",
		power: 40,
		cooldown: 4600,
		effects: [
			damage,
			increasePower(1, self, true),
		],
		reactions: []
	},
	{
		id: "void_specter",
		pic: "neutral_amu",
		power: 35,
		cooldown: 5200,
		effects: [
			poison
		],
		reactions: [
			reaction("regen", "column_allies", increasePower(5, self)),
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
			reaction("damage", "row_allies", increasePower(5, self)),
		]
	},
	{
		id: "toxic_alchemist",
		pic: "f5_drogon",
		power: 30,
		cooldown: 5200,
		effects: [
			poison,
			increaseCritical(5, column),
		],
		reactions: []
	},
	{
		id: "venomous_viper",
		pic: "neutral_serpenti",
		power: 40,
		cooldown: 5200,
		effects: [
			poison
		],
		reactions: [
			reaction("haste", "row_allies", increasePower(5, self)),
		]
	},
	{
		id: "noxious_blight",
		pic: "neutral_dreamgazer",
		power: 40,
		cooldown: 4300,
		effects: [
			poison,
			slow(1000, randomEnemy(1)),
		],
		reactions: []
	},
	{
		id: "corrosive_slime",
		pic: "f4_gloomchaser",
		power: 30,
		cooldown: 4300,
		effects: [
			poison
		],
		reactions: [
			reaction("shield", "enemies", increasePower(2, self)),
		]
	},
	{
		id: "infected_horror",
		pic: "f4_horror",
		power: 45,
		cooldown: 5700,
		effects: [
			poison
		],
		reactions: [
			reaction("poison", "allies", increasePower(2, self)),
		]
	},
	{
		id: "skeletal_mage",
		pic: "neutral_bonereaper",
		power: 35,
		cooldown: 4900,
		effects: [
			poison,
			haste(1000, column),
		],
		reactions: [
		]
	},
	{
		id: "scourge_bringer",
		pic: "f4_nocturn",
		power: 45,
		cooldown: 5500,
		effects: [
			poison,
		],
		reactions: [
			reaction("poison", "allies", increasePower(2, trigger)),
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
		power: 55,
		cooldown: 5200,
		effects: [
			shield,
			increasePower(1, randomAlly(1), true),
		],
		reactions: []
	},
	{
		id: "stone_guardian",
		pic: "neutral_golemstone",
		power: 20,
		cooldown: 4000,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "allies", increasePower(1, self, true)),
		]
	},
	{
		id: "shadow_assassin",
		pic: "boss_shadowlord",
		power: 30,
		"critical": 20,
		cooldown: 4300,
		effects: [
			damage,
			increaseCritical(5, self),
		],
		reactions: []
	},

	{
		id: "commander",
		pic: "f1_shieldforger",
		power: 50,
		cooldown: 6000,
		effects: [
			shield,
			increasePower(5, row),

		],
		reactions: []
	},
	{
		id: "avatar_of_anger",
		pic: "f2_chakriavatar",
		power: 50,
		critical: 10,
		cooldown: 6000,
		effects: [
			damage,
			increasePower(2, self, true),
		],
		reactions: []
	},
	{
		id: "chaos_knight",
		pic: "boss_chaosknight",
		power: 50,
		cooldown: 5500,
		effects: [
			damage,
		],
		reactions: [
			reaction("slow", "row_allies", charge(500, self))
		]
	},
	{
		id: "thunder_conduit",
		pic: "boss_borealjuggernaut",
		power: 55,
		cooldown: 6200,
		effects: [
			damage
		],
		reactions: [
			reaction("haste", "allies", increasePower(2, self)),
		]
	},
	{
		id: "arbiter",
		pic: "f1_peacekeeper",
		power: 35,
		cooldown: 5200,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "enemies", increasePower(2, self)),
		]
	},
	{
		id: "bastion",
		pic: "f1_mech",
		power: 30,
		cooldown: 4200,
		effects: [
			shield
		],
		reactions: [
			reaction("heal", "left_ally", increasePower(6, column)),
		]
	},
	{
		id: "aegis_warden",
		pic: "f2_demononi",
		power: 45,
		cooldown: 5100,
		effects: [
			shield
		],
		reactions: [
			reaction("poison", "column_allies", increasePower(4, trigger)),
		]
	},
	{
		id: "bulwark",
		pic: "f1_solarius",
		power: 12,
		cooldown: 4400,
		effects: [
			shield
		],
		reactions: [
			reaction("damage", "row_allies", increasePower(4, column)),
		]
	},
	{
		id: "void_shield",
		pic: "neutral_voidhunter",
		power: 30,
		cooldown: 4800,
		effects: [
			shield
		],
		reactions: [
			reaction("shield", "column_allies", increasePower(4, row)),
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
			reaction("shield", "allies", increasePower(6, left)),
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
			reaction("damage", "row_allies", increasePower(4, trigger)),
		]
	},
	{
		id: "battle_medic",
		pic: "neutral_healingmysticbandainamco",
		power: 30,
		cooldown: 3800,
		effects: [
			heal,
			increaseCritical(5, right),
		],
		reactions: []
	},
	{
		id: "light_priestess",
		pic: "neutral_healingmystic",
		power: 40,
		cooldown: 4700,
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
		power: 40,
		cooldown: 4500,
		effects: [
			heal,
			increasePower(1, bottom, true),
		],
		reactions: []
	},
	{
		id: "mender_of_worlds",
		pic: "f6_auroraguardian",
		power: 35,
		cooldown: 4200,
		effects: [
			heal,
			increasePower(1, left, true),
		],
		reactions: []
	},
	{
		id: "divine_spark",
		pic: "f3_obelyskduskwind",
		power: 20,
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
		power: 25,
		cooldown: 4800,
		effects: [
			heal
		],
		reactions: [
			reaction("all", "row_allies", increasePower(4, column)),
		]
	},
	{
		id: "oracle",
		pic: "neutral_timekeeper",
		power: 25,
		cooldown: 3300,
		effects: [
			heal
		],
		reactions: [
			reaction("all", "left_ally", increaseCritical(7, right)),
		]
	},
	{
		id: "chronomancer",
		pic: "f4_klaxon",
		power: 25,
		cooldown: 3700,
		effects: [
			regen
		],
		reactions: [
			reaction("haste", "allies", increasePower(7, self)),
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
		reactions: []
	},
	{
		id: "enchanted_tree",
		pic: "f6_treant",
		power: 25,
		cooldown: 3300,
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
		reactions: []
	},
	{
		id: "plague_dr",
		pic: "f4_plaguedr",
		power: 20,
		cooldown: 2900,
		effects: [
			regen,
		],
		reactions: [
			reaction("poison", "column_allies", increasePower(4, self)),
		]
	},
	{
		id: "eternal_phoenix",
		pic: "f2_firewyrm",
		power: 30,
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
		power: 50,
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
		power: 22,
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
		power: 30,
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
		power: 35,
		cooldown: 4500,
		effects: [
			regen,
			haste(1000, left),
		],
		reactions: []
	},
	{
		id: "time_shifter",
		pic: "f1_sister",
		power: 50,
		cooldown: 6200,
		effects: [
			shield,
		],
		reactions: [
			reaction("haste", "allies", increasePower(4, column)),
		]
	},
	{
		id: "time_magus",
		pic: "f2_mage4winds",
		power: 45,
		cooldown: 4900,
		effects: [
			damage,
			slow(1000, randomEnemy(1)),
		],
		reactions: []
	},
	{
		id: "mana_source",
		pic: "f4_furosa",
		power: 100,
		cooldown: 6400,
		rank: 2,
		effects: [
			regen,
			haste(1000, row),
		],
		reactions: [
			reaction("all", "column_allies", charge(500, self)),
		]
	},
	{
		id: "void_spawn",
		pic: "f5_ankylos",
		power: 40,
		cooldown: 4800,
		effects: [
			poison,
		],
		reactions: [
			reaction("poison", "column_allies", charge(500, self)),
		]
	},
	{
		id: "arcane_anomaly",
		pic: "f6_myriad",
		power: 45,
		cooldown: 5500,
		effects: [
			damage,
			charge(500, column),
		],
		reactions: []
	},
	{
		id: "mirror_entity",
		pic: "f3_nimbus",
		power: 30,
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
		power: 30,
		cooldown: 4500,
		effects: [
			damage,
			haste(1000, randomAlly(2)),
		],
		reactions: []
	},
	{
		id: "duelist",
		pic: "neutral_shuffler",
		power: 10,
		cooldown: 5200,
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
		power: 22,
		cooldown: 4100,
		effects: [
			damage,
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
		power: 30,
		cooldown: 6000,
		effects: [
			damage
		],
		reactions: [
			reaction("damage", "enemies", haste(500, self)),
		]
	},
	{
		id: "gunslinger",
		pic: "neutral_hsuku",
		power: 40,
		cooldown: 5000,
		effects: [
			damage,
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
		],
		reactions: [
			reaction("poison", "enemies", increasePower(2, self, true)),
		]
	},
	{
		id: "grove_guardian",
		pic: "neutral_keeperofthevale",
		power: 45,
		cooldown: 4800,
		rank: 2,
		effects: [
			regen,
			charge(500, row),
		],
		reactions: [
			reaction("damage", "enemies", increasePower(4, right)),
		]
	},
	{
		id: "thunder_core",
		pic: "neutral_emp",
		power: 75,
		rank: 2,
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
		power: 45,
		rank: 2,
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
		power: 45,
		rank: 2,
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
		power: 50,
		rank: 2,
		cooldown: 7000,
		effects: [
			poison,
			slow(2000, randomEnemy(2))
		],
		reactions: [
			reaction("damage", "enemies", increasePower(5, self)),
		]
	},
	{
		id: "coral_builder",
		pic: "neutral_giantcrab",
		power: 48,
		rank: 2,
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
		power: 145,
		rank: 3,
		cooldown: 6500,
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
		power: 110,
		rank: 3,
		cooldown: 7000,
		effects: [
			shield,
			increasePower(20, column),
		],
		reactions: [
			reaction("heal", "allies", increasePower(4, column))
		]
	},
	{
		id: "vanguard",
		pic: "neutral_gauntletmaster",
		power: 80,
		rank: 3,
		cooldown: 4300,
		effects: [
			damage,
			haste(2000, column),
		],
		reactions: [
			reaction("haste", "allies", increasePower(2, self, true)),
		]
	},
	{
		id: "veteran_paladin",
		pic: "neutral_goldenjusticar",
		power: 110,
		rank: 3,
		cooldown: 5200,
		effects: [
			regen,
			haste(2000, row)
		],
		reactions: [
			reaction("shield", "column_allies", increasePower(2, self, true))
		]
	},
	{
		id: "webert_the_old",
		pic: "neutral_goldenmantella",
		power: 48,
		rank: 3,
		cooldown: 7400,
		effects: [
			heal,
			increasePower(20, row),
		],
		reactions: [
			reaction("regen", "column_allies", increasePower(5, row, true)),
		]
	},
	{
		// power distributor
		id: "walking_reactor",
		pic: "boss_protector",
		power: 62,
		rank: 3,
		locked: true,
		cooldown: 5000,
		effects: [
			shield,
			distributePower(row),
		],
		reactions: [
			reaction("all", "column_allies", increasePower(20, self))
		]
	},
	// power absorber
	{
		id: "spectral_knight",
		pic: "boss_gol",
		power: 18,
		rank: 3,
		locked: true,
		cooldown: 5600,
		effects: [
			damage,
			absorbPower(column)
		],
		reactions: [
			reaction("all", "row_allies", increasePower(20, column))
		]
	},
	// re-haste
	{
		id: "windlash_serpent",
		pic: "boss_serpenti",
		power: 95,
		rank: 3,
		locked: true,
		cooldown: 4300,
		effects: [
			shield,
			haste(2000, row)
		],
		reactions: [
			reaction("re_hasted", "allies", increasePower(5, self))
		]
	},
	// re-slow
	{
		id: "corruption_bringer",
		pic: "boss_legion",
		power: 135,
		rank: 3,
		locked: true,
		cooldown: 5000,
		effects: [
			poison,
			slow(2000, randomEnemy(2))
		],
		reactions: [
			reaction("re_slow", "allies", decreasePower(2, strongestEnemy))
		]
	},
	//on_crit
	{
		id: "frontline_dasher",
		pic: "boss_kane",
		power: 58,
		rank: 3,
		locked: true,
		cooldown: 5700,
		effects: [
			damage,
			increaseCritical(10, column)
		],
		reactions: [
			reaction("on_crit", "allies", increasePower(20, column))
		]
	},
	//over_heal
	{
		id: "life_balancekeeper",
		pic: "f3_anubis",
		life: 1500,
		power: 105,
		rank: 3,
		locked: true,
		cooldown: 4500,
		effects: [
			heal,
		],
		reactions: [
			reaction("on_over_heal", "allies", increasePower(1, allAllies, true))
		]
	},
	//Balancer
	{
		id: "destiny_balancer",
		pic: "f3_allomancer",
		life: 1500,
		power: 170,
		rank: 3,
		locked: true,
		cooldown: 4600,
		effects: [
			shield,
			decreasePower(5, strongestAlly),
			multiplyPower(1.1, weakestAlly)
		],
		reactions: []
	},
	//metronome
	{
		id: "cadence_warden",
		pic: "f6_3rdgeneral",
		life: 1500,
		power: 70,
		rank: 2,
		locked: true,
		cooldown: 5500,
		effects: [
			heal,
		],
		reactions: [
			reaction("all", "left_ally", haste(2000, right)),
			reaction("all", "right_ally", haste(2000, left)),
		]
	},
	//damage -> poison
	{
		id: "essence_harvester",
		pic: "boss_malyk",
		power: 65,
		rank: 3,
		locked: true,
		cooldown: 4300,
		effects: [
			poison,
		],
		reactions: [
			reaction("every_100_damage", "allies", increasePower(5, allAlliesOfType("poison"))),
		],
	},
	//poison -> damage
	{
		id: "plague_incubator",
		pic: "boss_manaman",
		power: 65,
		rank: 3,
		locked: true,
		cooldown: 4300,
		effects: [
			poison,
		],
		reactions: [
			reaction("every_10_poison", "allies", increasePower(5, allAlliesOfType("damage"))),
		],
	},
	//shield -> damage
	{
		id: "tempest_ravager",
		pic: "boss_invader",
		power: 65,
		rank: 3,
		locked: true,
		cooldown: 4300,
		effects: [
			regen,
		],
		reactions: [
			reaction("every_100_shield", "allies", increasePower(5, allAlliesOfType("damage"))),
		],
	},
	//shield -> heal
	{
		id: "paragon",
		pic: "boss_paragon",
		power: 65,
		rank: 3,
		locked: true,
		cooldown: 4300,
		effects: [
			regen,
		],
		reactions: [
			reaction("every_100_shield", "allies", increasePower(5, allAlliesOfType("heal"))),
		],
	},
	//heal -> regen
	{
		id: "vitality_channeler",
		pic: "f2_sepukku",
		power: 65,
		rank: 3,
		locked: true,
		cooldown: 4300,
		effects: [
			heal,
		],
		reactions: [
			reaction("every_100_heal", "allies", increasePower(5, allAlliesOfType("regen"))),
		],
	},
	//regen -> heal
	{
		id: "mend_sage",
		pic: "boss_orias",
		power: 80,
		rank: 3,
		locked: true,
		cooldown: 5200,
		effects: [
			heal,
		],
		reactions: [
			reaction("every_10_regen", "allies", increasePower(5, allAlliesOfType("heal"))),
		],
	},
	//gambler2
	{
		id: "fate_shifter",
		pic: "boss_sandpanther",
		power: 175,
		rank: 3,
		locked: true,
		cooldown: 6200,
		effects: [
			damage,
			multiplyPower(1.1, right),
			multiplyPower(1.2, weakestEnemy)
		],
		reactions: [],
	},
]

export const BASE_COLLECTION_DATA: CardCollection = {
	id: "base",
	"name": "Base Set",
	"cards": cards
}