import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import { openHeroShop } from "./Shop/HeroShop";
import { pickRandom } from "utils";
import { openOrbShop } from "./Shop/OrbShop";
import { getState } from "@Models/State";
import { CardDefinition } from "@Models/Entities/Card";
import { createEncounterCard } from "@Scenes/Battleground/Systems/Components/EncounterCard";

const MIN_ROUND_FOR_SILVER_SHOP = 1;
const MIN_ROUND_FOR_GOLD_SHOP = 6;

const openHeroShopCallback = (container: Phaser.GameObjects.Container, type: string) => async () => {
	container.destroy(true);
	const round = getState().gameData.round;
	const isValidRound = (card: CardDefinition) => {
		if (card.rank) {
			if (round <= MIN_ROUND_FOR_SILVER_SHOP && card.rank === 2) {
				return false;
			}
			if (round >= MIN_ROUND_FOR_GOLD_SHOP && card.rank === 3) {
				return true;
			}
			if (round < MIN_ROUND_FOR_GOLD_SHOP && card.rank === 3) {
				return false;
			}
		}
		return true;
	}
	await openHeroShop(
		(card) => card.effects.some(eff => eff.id === type) && isValidRound(card)
	);
	PhaseManager.handlePhaseEnded();
}

const rankHeroShopCallback = (container: Phaser.GameObjects.Container, rank: number) => async () => {
	container.destroy(true);
	await openHeroShop(
		(card) => card.rank === rank
	);
	PhaseManager.handlePhaseEnded();
}

type EncounterItem = {
	name: string;
	pic: string;
	description: string;
	onClick: () => Promise<void>;
	minRound?: number;
	maxRound?: number;
};

const encounterIndex = (container: Phaser.GameObjects.Container): EncounterItem[] => [
	{
		name: t("encounters.upgrade_unit.name"),
		pic: "ui/upgrade_unit",
		description: t("encounters.upgrade_unit.desc"),
		onClick: orbShopCallback(container, ["upgrade_orb"])
	},
	improveType(container, "ui/improve_damage", "damage"),
	improveType(container, "ui/improve_heal", "heal"),
	improveType(container, "ui/improve_shield", "shield"),
	improveType(container, "ui/toxic", "poison"),
	improveType(container, "ui/improve_regen", "regen"),
	{
		name: t("encounters.armory.name"),
		pic: "ui/armory",
		description: t("encounters.armory.desc"),
		onClick: openHeroShopCallback(container, "damage")
	},
	{
		name: t("encounters.healing_tent.name"),
		pic: "ui/improve_heal",
		description: t("encounters.healing_tent.desc"),
		onClick: openHeroShopCallback(container, "heal")
	},
	{
		name: t("encounters.frontier_fort.name"),
		pic: "ui/frontier_fort",
		description: t("encounters.frontier_fort.desc"),
		onClick: openHeroShopCallback(container, "shield")
	},
	{
		name: t("encounters.forest_pools.name"),
		pic: "ui/forest_pools",
		description: t("encounters.forest_pools.desc"),
		onClick: openHeroShopCallback(container, "regen")
	},
	{
		name: t("encounters.toxic_chamber.name"),
		pic: "ui/toxic",
		description: t("encounters.toxic_chamber.desc"),
		onClick: openHeroShopCallback(container, "poison")
	},
	{
		name: t("encounters.trial_circuit.name"),
		pic: "ui/trial_circuit",
		description: t("encounters.trial_circuit.desc"),
		onClick: openHeroShopCallback(container, "haste")
	},
	{
		name: t("encounters.trappers_guild.name"),
		pic: "ui/improve_slow",
		description: t("encounters.trappers_guild.desc"),
		onClick: openHeroShopCallback(container, "slow")
	},
	{
		name: t("encounters.thunder_spire.name"),
		pic: "ui/thunder_spire",
		description: t("encounters.thunder_spire.desc"),
		onClick: openHeroShopCallback(container, "charge")
	},
	{
		name: t("encounters.commanders_tent.name"),
		pic: "ui/commander",
		description: t("encounters.commanders_tent.desc"),
		onClick: openHeroShopCallback(container, "increase_power")
	},
	{
		name: t("encounters.assassins_hideout.name"),
		pic: "ui/assassin",
		description: t("encounters.assassins_hideout.desc"),
		onClick: openHeroShopCallback(container, "increase_critical")
	},
	{
		name: t("encounters.power_distributor.name"),
		pic: "ui/power_distributor",
		description: t("encounters.power_distributor.desc"),
		minRound: 3,
		onClick: orbShopCallback(container, ["distribute_power_orb"])
	},
	{
		name: t("encounters.power_absorber.name"),
		pic: "ui/power_absorber",
		description: t("encounters.power_absorber.desc"),
		minRound: 3,
		onClick: orbShopCallback(container, ["absorb_power_orb"])
	},
	// {
	// 	name: t("encounters.dark_ritual.name"),
	// 	pic: "ui/dark_ritual",
	// 	description: t("encounters.dark_ritual.desc"),
	// 	onClick: orbShopCallback(container, ["sacrifice_effect_orb"])
	// },
	{
		name: t("encounters.silver_shop"),
		pic: "ui/silver_medal",
		description: t("encounters.silver_shop_desc"),
		minRound: MIN_ROUND_FOR_SILVER_SHOP,
		maxRound: MIN_ROUND_FOR_GOLD_SHOP - 1,
		onClick: rankHeroShopCallback(container, 2)
	},
	{
		name: t("encounters.gold_shop"),
		pic: "ui/gold_medal",
		description: t("encounters.gold_shop_desc"),
		minRound: MIN_ROUND_FOR_GOLD_SHOP,
		onClick: rankHeroShopCallback(container, 3)
	}
];

function improveType(container: Phaser.GameObjects.Container, pic: string, type: string) {
	return {
		name: t("encounters.improve_type.name", { type }),
		pic,
		minRound: 4,
		description: t("encounters.improve_type.desc", { type }),
		onClick: orbShopCallback(container, [
			`increase_power_on_${type}`,
			`decrease_cooldown_on_${type}`,
			`increase_critical_on_${type}`
		])
	};
}

function orbShopCallback(container: Phaser.GameObjects.Container, orbs: string[]) {
	return async () => {
		container.destroy(true);
		await openOrbShop(orbs);
		PhaseManager.handlePhaseEnded();
	};
}

export async function open() {
	const container = io.Container();

	const index = encounterIndex(container).filter(e => {

		if (e.minRound) {
			return e.minRound <= getState().gameData.round;
		}

		if (e.maxRound) {
			return e.maxRound >= getState().gameData.round;
		}

		return true;
	})

	const encounters = pickRandom(index, 3)

	const nextRoundCallback = async () => {
		container.destroy(true);
		PhaseManager.handlePhaseEnded();
	}

	encounters.forEach((encounter, index) => {

		const x = SCREEN_WIDTH - 460;
		const y = 300 + index * 220;

		createEncounterCard(container, {
			x,
			y,
			width: 550,
			height: 200,
			name: encounter.name,
			pic: encounter.pic,
			description: encounter.description,
			onClick: encounter.onClick
		});

	});

	const btn = createUIButton(t("encounters.skip"),
		vec2(SCREEN_WIDTH - 260, SCREEN_HEIGHT - 50),
		nextRoundCallback
	);

	container.add(btn.container);

}

