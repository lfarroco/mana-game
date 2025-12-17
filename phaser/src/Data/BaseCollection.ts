import { CardCollection } from "@Models/Entities/Card";
import { Effect, EffectId, EffectReaction, EffectSourcePosition, Targeting } from "TriggerSystem/TriggerSystem";

const effectRegen: Effect = { "id": "regen" };
const effectDamage: Effect = { "id": "damage" };
const effectHeal: Effect = { "id": "heal" };
const effectShield: Effect = { "id": "shield" };
const effectPoison: Effect = { "id": "poison" };

const effectHaste = (duration: number, targets: Targeting): Effect => ({ id: "haste", duration, targets });
const effectSlow = (duration: number, targets: Targeting): Effect => ({ id: "slow", duration, targets });
const effectCharge = (duration: number, targets: Targeting): Effect => ({ id: "charge", duration, targets });
const targetingColumnAllies: Targeting = { "id": "column_allies" };
const targetingRowAllies: Targeting = { "id": "row_allies" };
const targetingRandomAlly = (count: number): Targeting => ({ id: "random_ally", count });
const targetingRandomEnemy = (count: number): Targeting => ({ id: "random_enemy", count });
const targetingTrigger: Targeting = { id: "trigger" };
const targetingSelf: Targeting = { "id": "self" };
const effectIncreasePower = (amount: number, targets: Targeting, permanent: boolean = false): Effect => ({ "id": "increase_power", "amount": amount, permanent, "targets": targets });
const effectIncreaseCritical = (amount: number, targets: Targeting): Effect => ({ "id": "increase_critical", amount, targets });
const reaction = (effect: EffectId | "all", position: EffectSourcePosition, reactWith: Effect): EffectReaction => ({
	position,
	effectId: effect,
	effects: [
		reactWith
	]
})

const targetingLeftAlly: Targeting = { "id": "left_ally" };
const targetingRightAlly: Targeting = { "id": "right_ally" };
const targetingTopAlly: Targeting = { "id": "top_ally" };
const targetingBottomAlly: Targeting = { "id": "bottom_ally" };
const targetingWeakestAlly: Targeting = { "id": "weakest_ally" };

export const BASE_COLLECTION_DATA: CardCollection = {
	"id": "base",
	"name": "Base Set",
	"cards": [
		{
			"id": "mana_crystal",
			"pic": "blue-stone",
			"life": 500,
			"power": 10,
			"cooldown": 5200,
			"isCore": true,
			"effects": [
				effectRegen,
				effectIncreasePower(5, targetingColumnAllies),
			],
			"reactions": [
				reaction("all", "row_allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "critical_crystal",
			"pic": "red-stone",
			"life": 500,
			"power": 15,
			"cooldown": 5200,
			"isCore": true,
			"effects": [
				effectDamage,
				effectIncreaseCritical(5, targetingColumnAllies),
			],
			"reactions": [
				reaction("all", "row_allies", effectIncreasePower(5, targetingColumnAllies)),
			]
		},
		{
			"id": "protective_crystal",
			"pic": "yellow-stone",
			"life": 600,
			"power": 10,
			"cooldown": 4500,
			"isCore": true,
			"reflect": 15,
			"effects": [
				effectShield,
				effectIncreasePower(5, targetingRandomAlly(1), true),
			],
			"reactions": [
				reaction("all", "row_allies", effectIncreasePower(5, targetingTrigger)),
			]
		},
		{
			"id": "growth_crystal",
			"pic": "green-stone",
			"life": 500,
			"power": 15,
			"cooldown": 5000,
			"isCore": true,
			"effects": [
				effectIncreasePower(1, targetingColumnAllies, true),
				effectHeal,
			],
			"reactions": [
				reaction("all", "row_allies", effectIncreasePower(1, targetingTrigger, true)),
			]
		},
		{
			"id": "purple_crystal",
			"pic": "purple-stone",
			"life": 500,
			"power": 20,
			"cooldown": 5500,
			"isCore": true,
			"effects": [
				effectPoison,
				effectSlow(1000, targetingRandomEnemy(1)),
			],
			"reactions": [
				reaction("slow", "allies", effectIncreasePower(5, targetingTrigger, true)),
			]
		},
		{
			"id": "void_witch",
			"pic": "boss_andromeda",
			"power": 20,
			"cooldown": 5400,
			"effects": [
				effectPoison,
				effectSlow(1000, targetingRandomEnemy(1)),
			],
			"reactions": [
				reaction("slow", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "living_armor",
			"pic": "f1_tank",
			"power": 35,
			"cooldown": 5100,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("damage", "column_allies", effectIncreasePower(5, targetingTrigger)),
			]
		},
		{
			"id": "thunder_mech",
			"pic": "f3_mech",
			"power": 20,
			"cooldown": 5200,
			"effects": [
				effectDamage
			],
			"reactions": [
				reaction("haste", "allies", effectIncreaseCritical(5, targetingSelf)),

			]
		},
		{
			"id": "timebender",
			"pic": "boss_spelleater",
			"power": 15,
			"cooldown": 5000,
			"effects": [
				effectShield,
				effectIncreasePower(1, targetingRandomAlly(1), true),
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingRowAllies)),
			]
		},
		{
			"id": "tek_monk",
			"pic": "f3_windgiver",
			"power": 20,
			"cooldown": 4600,
			"effects": [
				effectDamage,
				effectIncreasePower(1, targetingSelf, true),
			],
			"reactions": [
				reaction("heal", "column_allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "void_specter",
			"pic": "neutral_amu",
			"power": 15,
			"cooldown": 5200,
			"effects": [
				effectPoison
			],
			"reactions": [
				reaction("regen", "enemies", effectIncreasePower(2, targetingSelf)),
			]
		},
		{
			"id": "plaguebearer",
			"pic": "f3_plague_totem",
			"power": 15,
			"cooldown": 3800,
			"effects": [
				effectPoison
			],
			"reactions": [
				reaction("regen", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "toxic_alchemist",
			"pic": "f5_drogon",
			"power": 20,
			"cooldown": 5200,
			"effects": [
				effectPoison,
				effectIncreaseCritical(5, targetingColumnAllies),
			],
			"reactions": [
				reaction("regen", "enemies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "venomous_viper",
			"pic": "neutral_serpenti",
			"power": 20,
			"cooldown": 5200,
			"effects": [
				effectPoison
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "noxious_blight",
			"pic": "neutral_dreamgazer",
			"power": 30,
			"cooldown": 4300,
			"effects": [
				effectPoison,
				effectSlow(1000, targetingRandomEnemy(1)),
			],
			"reactions": [
				reaction("poison", "allies", effectHaste(1000, targetingSelf)),
			]
		},
		{
			"id": "corrosive_slime",
			"pic": "f4_gloomchaser",
			"power": 20,
			"cooldown": 4300,
			"effects": [
				effectPoison
			],
			"reactions": [
				reaction("shield", "enemies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "infected_horror",
			"pic": "f4_horror",
			"power": 30,
			"cooldown": 5700,
			"effects": [
				effectPoison
			],
			"reactions": [
				reaction("poison", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "skeletal_mage",
			"pic": "neutral_bonereaper",
			"power": 40,
			"cooldown": 4900,
			"effects": [
				effectPoison
			],
			"reactions": [
				reaction("poison", "allies", effectIncreasePower(5, targetingTrigger)),
			]
		},
		{
			"id": "scourge_bringer",
			"pic": "f4_nocturn",
			"power": 20,
			"cooldown": 5500,
			"effects": [
				effectPoison,
				effectHaste(1000, targetingColumnAllies),
			],
			"reactions": [
				reaction("poison", "column_allies", effectIncreasePower(5, targetingTrigger)),
			]
		},
		{
			"id": "diana",
			"pic": "neutral_arrowwhistler",
			"power": 30,
			"cooldown": 5600,
			"effects": [
				effectDamage
			],
			"reactions": [
				reaction("shield", "allies", effectHaste(1000, targetingSelf)),
			]
		},
		{
			"id": "moss_golem",
			"pic": "neutral_golemnature",
			"power": 30,
			"cooldown": 5200,
			"effects": [
				effectShield,
				effectIncreasePower(1, targetingRandomAlly(1), true),
			],
			"reactions": [
				reaction("regen", "column_allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "stone_guardian",
			"pic": "neutral_golemstone",
			"power": 10,
			"cooldown": 5200,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("damage", "allies", effectIncreasePower(1, targetingSelf, true)),
			]
		},
		{
			"id": "shadow_assassin",
			"pic": "boss_shadowlord",
			"power": 10,
			"critical": 20,
			"cooldown": 4300,
			"effects": [
				effectDamage,
				effectIncreaseCritical(5, targetingSelf),
			],
			"reactions": [
				reaction("heal", "enemies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "quickstone",
			"pic": "haste-stone",
			"life": 500,
			"power": 15,
			"cooldown": 4500,
			"isCore": true,
			"effects": [
				effectHaste(1000, targetingRowAllies),
				effectRegen
			],
			"reactions": [
				reaction("all", "row_allies", effectCharge(500, targetingColumnAllies)),
			]
		},
		{
			"id": "commander",
			"pic": "f1_shieldforger",
			"power": 30,
			"cooldown": 6000,
			"effects": [
				effectShield,
				effectIncreasePower(5, targetingColumnAllies),
				effectIncreasePower(5, targetingRowAllies),
			],
			"reactions": []
		},
		{
			"id": "avatar_of_anger",
			"pic": "f2_chakriavatar",
			"power": 20,
			"critical": 10,
			"cooldown": 5000,
			"effects": [
				effectDamage,
				effectIncreasePower(1, targetingSelf, true),
			],
			"reactions": [
				reaction("damage", "column_allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "chaos_knight",
			"pic": "boss_chaosknight",
			"power": 30,
			"cooldown": 5500,
			"effects": [
				effectDamage,
				effectSlow(1000, targetingRandomEnemy(1)),
			],
			"reactions": [
				reaction("shield", "enemies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "thunder_conduit",
			"pic": "boss_borealjuggernaut",
			"power": 30,
			"cooldown": 6200,
			"effects": [
				effectDamage
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "arbiter",
			"pic": "f1_peacekeeper",
			"power": 10,
			"cooldown": 6200,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("damage", "enemies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "bastion",
			"pic": "f1_mech",
			"power": 20,
			"cooldown": 4200,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("heal", "left_ally", effectIncreasePower(10, targetingColumnAllies)),
			]
		},
		{
			"id": "aegis_warden",
			"pic": "f2_demononi",
			"power": 25,
			"cooldown": 5100,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("poison", "column_allies", effectIncreasePower(5, targetingTrigger)),
			]
		},
		{
			"id": "bulwark",
			"pic": "f1_solarius",
			"power": 20,
			"cooldown": 4400,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("damage", "row_allies", effectIncreasePower(5, targetingColumnAllies)),
			]
		},
		{
			"id": "void_shield",
			"pic": "neutral_voidhunter",
			"power": 20,
			"cooldown": 4800,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("shield", "column_allies", effectIncreasePower(5, targetingRowAllies)),
			]
		},
		{
			"id": "fortress",
			"pic": "boss_city",
			"power": 20,
			"cooldown": 5200,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("shield", "allies", effectIncreasePower(5, targetingLeftAlly)),
			]
		},
		{
			"id": "parry_master",
			"pic": "neutral_swordofakrane",
			"power": 20,
			"cooldown": 5800,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("damage", "enemies", effectIncreasePower(2, targetingColumnAllies)),
			]
		},
		{
			"id": "cleric",
			"pic": "neutral_healingmystictwitch",
			"power": 20,
			"cooldown": 4100,
			"effects": [
				effectHeal
			],
			"reactions": [
				reaction("damage", "row_allies", effectIncreasePower(5, targetingTrigger)),
			]
		},
		{
			"id": "battle_medic",
			"pic": "neutral_healingmysticbandainamco",
			"power": 35,
			"cooldown": 6800,
			"effects": [
				effectHeal,
				effectIncreaseCritical(5, targetingRightAlly),
			],
			"reactions": [
				reaction("shield", "column_allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "light_priestess",
			"pic": "neutral_healingmystic",
			"power": 25,
			"cooldown": 5700,
			"effects": [
				effectHeal
			],
			"reactions": [
				reaction("shield", "row_allies", effectIncreasePower(1, targetingTopAlly, true)),
			]
		},
		{
			"id": "soul_weaver",
			"pic": "boss_soulstealer",
			"power": 15,
			"cooldown": 4700,
			"effects": [
				effectHeal,
				effectIncreasePower(1, targetingBottomAlly, true),
			],
			"reactions": [
				reaction("shield", "row_allies", effectIncreasePower(5, targetingTrigger)),
			]
		},
		{
			"id": "mender_of_worlds",
			"pic": "f6_auroraguardian",
			"power": 35,
			"cooldown": 6200,
			"effects": [
				effectHeal,
				effectIncreasePower(1, targetingLeftAlly, true),
			],
			"reactions": [
				reaction("all", "column_allies", effectHaste(1000, targetingSelf)),
			]
		},
		{
			"id": "divine_spark",
			"pic": "f3_obelyskduskwind",
			"power": 35,
			"cooldown": 4200,
			"effects": [
				effectHeal
			],
			"reactions": [
				reaction("all", "column_allies", effectHaste(1000, targetingRowAllies)),
			]
		},
		{
			"id": "radiance_envoy",
			"pic": "boss_cindera",
			"power": 30,
			"cooldown": 5700,
			"effects": [
				effectHeal
			],
			"reactions": [
				reaction("all", "row_allies", effectHaste(1000, targetingColumnAllies)),
			]
		},
		{
			"id": "harmony_monk",
			"pic": "boss_harmony",
			"power": 20,
			"cooldown": 4800,
			"effects": [
				effectHeal
			],
			"reactions": [
				reaction("all", "row_allies", effectIncreasePower(5, targetingColumnAllies)),
			]
		},
		{
			"id": "oracle",
			"pic": "neutral_timekeeper",
			"power": 30,
			"cooldown": 3300,
			"effects": [
				effectHeal
			],
			"reactions": [
				reaction("all", "left_ally", effectIncreaseCritical(10, targetingRightAlly)),
			]
		},
		{
			"id": "chronomancer",
			"pic": "f4_klaxon",
			"power": 20,
			"cooldown": 3700,
			"effects": [
				effectRegen
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "spirit_of_the_forest",
			"pic": "boss_crystal",
			"power": 30,
			"cooldown": 4800,
			"effects": [
				effectRegen,
				effectHaste(1000, targetingRowAllies),
			],
			"reactions": [
				reaction("all", "column_allies", effectIncreaseCritical(5, targetingColumnAllies)),
			]
		},
		{
			"id": "enchanted_tree",
			"pic": "f6_treant",
			"power": 10,
			"cooldown": 2300,
			"effects": [
				effectRegen
			],
			"reactions": [
				reaction("all", "row_allies", effectIncreasePower(1, targetingSelf, true)),
			]
		},
		{
			"id": "castle_vampire",
			"pic": "boss_vampire",
			"power": 20,
			"cooldown": 2900,
			"effects": [
				effectRegen,
				effectIncreaseCritical(5, targetingSelf),
			],
			"reactions": [
				reaction("damage", "column_allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "plague_dr",
			"pic": "f4_plaguedr",
			"power": 20,
			"cooldown": 2900,
			"effects": [
				effectRegen,
				effectSlow(1000, targetingRandomEnemy(1)),
			],
			"reactions": [
				reaction("poison", "column_allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "eternal_phoenix",
			"pic": "f2_firewyrm",
			"power": 20,
			"cooldown": 4300,
			"effects": [
				effectRegen
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingWeakestAlly)),
			]
		},
		{
			"id": "sand_shifter",
			"pic": "f3_sandhowler",
			"power": 30,
			"cooldown": 5800,
			"effects": [
				effectRegen
			],
			"reactions": [
				reaction("slow", "column_allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "crystalline_geode",
			"pic": "f6_crystalbeetle",
			"power": 40,
			"cooldown": 4200,
			"effects": [
				effectRegen
			],
			"reactions": [
				reaction("all", "allies", effectIncreaseCritical(5, targetingRowAllies)),
			]
		},
		{
			"id": "blood_catalyst",
			"pic": "neutral_bloodletter",
			"power": 20,
			"cooldown": 4200,
			"effects": [
				effectRegen
			],
			"reactions": [
				reaction("heal", "allies", effectIncreasePower(1, targetingSelf, true)),
			]
		},
		{
			"id": "symbiote",
			"pic": "f5_mech",
			"power": 20,
			"cooldown": 4500,
			"effects": [
				effectRegen,
				effectHaste(1000, targetingLeftAlly),
			],
			"reactions": [
				reaction("shield", "row_allies", effectIncreasePower(5, targetingColumnAllies)),
			]
		},
		{
			"id": "time_shifter",
			"pic": "f1_sister",
			"power": 6,
			"cooldown": 6500,
			"effects": [
				effectSlow(1000, targetingRandomEnemy(1)),
				effectCharge(500, targetingRowAllies),
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingColumnAllies)),
			]
		},
		{
			"id": "time_magus",
			"pic": "f2_mage4winds",
			"power": 10,
			"cooldown": 4900,
			"effects": [
				effectSlow(1000, targetingRandomEnemy(1)),
				effectDamage
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingColumnAllies)),
			]
		},
		{
			"id": "mana_source",
			"pic": "f4_furosa",
			"power": 10,
			"cooldown": 6000,
			"effects": [
				effectRegen,
				effectHaste(2000, targetingRowAllies),
			],
			"reactions": [
				reaction("all", "row_allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "void_spawn",
			"pic": "f5_ankylos",
			"power": 10,
			"cooldown": 6000,
			"effects": [
				effectPoison,
				effectHaste(2000, targetingColumnAllies),
			],
			"reactions": [
				reaction("poison", "allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "arcane_anomaly",
			"pic": "f6_myriad",
			"power": 15,
			"cooldown": 5500,
			"effects": [
				effectDamage,
				effectCharge(1000, targetingColumnAllies),
			],
			"reactions": [
				reaction("shield", "column_allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "mirror_entity",
			"pic": "f3_nimbus",
			"power": 10,
			"cooldown": 4500,
			"effects": [
				effectShield
			],
			"reactions": [
				reaction("all", "bottom_ally", effectIncreasePower(10, targetingTopAlly)),
			]
		},
		{
			"id": "spellbreaker",
			"pic": "neutral_spelljammer",
			"power": 10,
			"cooldown": 4500,
			"effects": [
				effectDamage,
				effectHaste(1000, targetingRowAllies),
			],
			"reactions": [
				reaction("poison", "allies", effectHaste(1000, targetingRandomAlly(1))),
			]
		},
		{
			"id": "duelist",
			"pic": "neutral_shuffler",
			"power": 20,
			"cooldown": 4500,
			"effects": [
				effectDamage
			],
			"reactions": [
				reaction("damage", "enemies", effectIncreasePower(4, targetingSelf)),
			]
		},
		{
			"id": "gambler",
			"pic": "neutral_gambler",
			"power": 10,
			"cooldown": 4200,
			"effects": [
				effectShield,
				effectIncreaseCritical(5, targetingColumnAllies),
			],
			"reactions": [
				reaction("all", "row_allies", effectIncreaseCritical(5, targetingRandomEnemy(1))),
			]
		},
		{
			"id": "glass_cannon",
			"pic": "f1_sinergyunit",
			"power": 30,
			"cooldown": 4100,
			"effects": [
				effectDamage,
				effectIncreaseCritical(5, targetingSelf),
			],
			"reactions": [
				reaction("shield", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "spellblade",
			"pic": "f1_rightfulheir",
			"power": 30,
			"cooldown": 4100,
			"effects": [
				effectDamage
			],
			"reactions": [
				reaction("all", "row_allies", effectIncreaseCritical(5, targetingSelf)),
			]
		},
		{
			"id": "berserker",
			"pic": "neutral_beastmaster",
			"power": 40,
			"cooldown": 5200,
			"effects": [
				effectDamage
			],
			"reactions": [
				reaction("damage", "enemies", effectHaste(1000, targetingSelf)),
			]
		},
		{
			"id": "gunslinger",
			"pic": "neutral_hsuku",
			"power": 20,
			"cooldown": 5000,
			"effects": [
				effectDamage,
				effectCharge(500, targetingColumnAllies),
			],
			"reactions": [
				reaction("shield", "column_allies", effectCharge(500, targetingSelf)),
			]
		},
		{
			"id": "inquisitor",
			"pic": "neutral_inquisitorkron",
			"power": 20,
			"cooldown": 4800,
			"effects": [
				effectDamage,
				effectCharge(500, targetingLeftAlly),
			],
			"reactions": [
				reaction("poison", "enemies", effectIncreasePower(2, targetingSelf, true)),
			]
		},
		{
			"id": "grove_guardian",
			"pic": "neutral_keeperofthevale",
			"power": 20,
			"cooldown": 4800,
			"effects": [
				effectRegen,
				effectCharge(500, targetingRightAlly),
			],
			"reactions": [
				reaction("damage", "enemies", effectIncreasePower(4, targetingRightAlly)),
			]
		},
		{
			"id": "thunder_core",
			"pic": "neutral_emp",
			"power": 30,
			"rank": 2,
			"cooldown": 5800,
			"effects": [
				effectDamage,
				effectCharge(1000, targetingLeftAlly),
			],
			"reactions": [
				reaction("haste", "column_allies", effectIncreasePower(6, targetingSelf, true)),
			]
		},
		{
			"id": "conduit_howler",
			"pic": "neutral_exun",
			"power": 30,
			"rank": 2,
			"cooldown": 4800,
			"effects": [
				effectShield,
				effectHaste(2000, targetingColumnAllies),
			],
			"reactions": [
				reaction("haste", "row_allies", effectIncreasePower(4, targetingColumnAllies, true)),
			]
		},
		{
			"id": "water_elemental",
			"pic": "neutral_fog",
			"power": 30,
			"rank": 2,
			"cooldown": 5800,
			"effects": [
				effectHeal,
				effectCharge(1000, targetingColumnAllies),
			],
			"reactions": [
				reaction("regen", "row_allies", effectIncreasePower(6, targetingTrigger, true)),
			]
		},
		{
			"id": "master_of_thorns",
			"pic": "neutral_geargrinder",
			"power": 30,
			"rank": 2,
			"cooldown": 7800,
			"effects": [
				effectPoison
			],
			"reactions": [
				reaction("damage", "enemies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "coral_builder",
			"pic": "neutral_giantcrab",
			"power": 30,
			"rank": 2,
			"cooldown": 5800,
			"effects": [
				effectRegen,
				effectHaste(2000, targetingColumnAllies),
			],
			"reactions": [
				reaction("shield", "allies", effectIncreasePower(5, targetingSelf)),
			]
		},
		{
			"id": "toxicologist",
			"pic": "neutral_gnasher",
			"power": 40,
			"rank": 3,
			"cooldown": 6800,
			"effects": [
				effectPoison,
				effectSlow(2000, targetingRandomEnemy(2)),
			],
			"reactions": [
				reaction("poison", "allies", effectIncreasePower(6, targetingSelf)),
			]
		},
		{
			"id": "expedition_leader",
			"pic": "neutral_goldenhammer",
			"power": 30,
			"rank": 3,
			"cooldown": 7300,
			"effects": [
				effectShield,
				effectIncreasePower(10, targetingColumnAllies),
			],
			"reactions": [
				reaction("heal", "allies", effectIncreasePower(4, targetingColumnAllies))
			]
		},
		{
			"id": "vanguard",
			"pic": "neutral_gauntletmaster",
			"power": 40,
			"rank": 3,
			"cooldown": 4300,
			"effects": [
				effectDamage,
				effectHaste(2000, targetingColumnAllies),
			],
			"reactions": [
				reaction("haste", "allies", effectIncreasePower(5, targetingSelf, true)),
			]
		},
		{
			"id": "veteran_paladin",
			"pic": "neutral_goldenjusticar",
			"power": 40,
			"rank": 3,
			"cooldown": 5400,
			"effects": [
				effectRegen
			],
			"reactions": [
				reaction("shield", "column_allies", effectIncreasePower(5, targetingSelf, true))
			]
		},
		{
			"id": "webert_the_old",
			"pic": "neutral_goldenmantella",
			"power": 40,
			"rank": 3,
			"cooldown": 7400,
			"effects": [
				effectHeal,
				effectIncreasePower(20, targetingRowAllies),
			],
			"reactions": [
				reaction("regen", "column_allies", effectIncreasePower(5, targetingRowAllies, true)),
			]
		}
	]
}