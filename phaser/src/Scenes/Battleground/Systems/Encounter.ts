import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import { openHeroShop } from "./Shop/HeroShop";
import { pickRandom } from "utils";
import { openOrbShop } from "./Shop/OrbShop";
import { getState, State } from "@Models/State";
import { CardDefinition } from "@Models/Entities/Card";
import { createEncounterCard } from "@Scenes/Battleground/Systems/Components/EncounterCard";
import { MultiplayerManager } from "../../../Multiplayer/MultiplayerManager";

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
		(card) =>
			isValidRound(card) &&
			(card.effects?.some(eff => eff.id === type)
				|| card.reactions?.some(eff => eff.effects?.some(eff => eff.id === type)))

	);
	PhaseManager.handlePhaseEnded(getState());
}

const singleHeroOfRankShop = (container: Phaser.GameObjects.Container, rank: number) => async () => {
	container.destroy(true);
	await openHeroShop(
		(card) => card.rank === rank,
		1
	);
	PhaseManager.handlePhaseEnded(getState());
}

type EncounterItem = {
	name: string;
	pic: string;
	description: string;
	onClick: () => Promise<void>;
	minRound?: number;
	maxRound?: number;
	id?: string;
};

let currentEncounters: EncounterItem[] = [];

export async function chooseEncounter(index: number) {
	if (currentEncounters[index]) {
		await currentEncounters[index].onClick();
		return `Chose encounter ${index}: ${currentEncounters[index].name}`;
	}
	return `Invalid encounter index: ${index}. Available: ${currentEncounters.length}`;
}

export const getEncounterItems = (state: State, container: Phaser.GameObjects.Container): EncounterItem[] => [
	{
		name: t("encounters.upgrade_unit.name"),
		pic: "ui/upgrade_unit",
		description: t("encounters.upgrade_unit.desc"),
		onClick: orbShopCallback(state, container, ["upgrade_orb"]),
		id: "upgrade_unit"
	},
	improveType(state, container, "ui/improve_damage", "damage"),
	improveType(state, container, "ui/improve_heal", "heal"),
	improveType(state, container, "ui/improve_shield", "shield"),
	improveType(state, container, "ui/toxic", "poison"),
	improveType(state, container, "ui/improve_regen", "regen"),
	{
		name: t("encounters.armory.name"),
		pic: "ui/armory",
		description: t("encounters.armory.desc"),
		onClick: openHeroShopCallback(container, "damage"),
		id: "armory"
	},
	{
		name: t("encounters.healing_tent.name"),
		pic: "ui/improve_heal",
		description: t("encounters.healing_tent.desc"),
		onClick: openHeroShopCallback(container, "heal"),
		id: "healing_tent"
	},
	{
		name: t("encounters.frontier_fort.name"),
		pic: "ui/frontier_fort",
		description: t("encounters.frontier_fort.desc"),
		onClick: openHeroShopCallback(container, "shield"),
		id: "frontier_fort"
	},
	{
		name: t("encounters.forest_pools.name"),
		pic: "ui/forest_pools",
		description: t("encounters.forest_pools.desc"),
		onClick: openHeroShopCallback(container, "regen"),
		id: "forest_pools"
	},
	{
		name: t("encounters.toxic_chamber.name"),
		pic: "ui/toxic",
		description: t("encounters.toxic_chamber.desc"),
		onClick: openHeroShopCallback(container, "poison"),
		id: "toxic_chamber"
	},
	{
		name: t("encounters.trial_circuit.name"),
		pic: "ui/trial_circuit",
		description: t("encounters.trial_circuit.desc"),
		onClick: openHeroShopCallback(container, "haste"),
		id: "trial_circuit"
	},
	{
		name: t("encounters.trappers_guild.name"),
		pic: "ui/improve_slow",
		description: t("encounters.trappers_guild.desc"),
		onClick: openHeroShopCallback(container, "slow"),
		id: "trappers_guild"
	},
	{
		name: t("encounters.thunder_spire.name"),
		pic: "ui/thunder_spire",
		description: t("encounters.thunder_spire.desc"),
		onClick: openHeroShopCallback(container, "charge"),
		id: "thunder_spire"
	},
	{
		name: t("encounters.commanders_tent.name"),
		pic: "ui/commander",
		description: t("encounters.commanders_tent.desc"),
		onClick: openHeroShopCallback(container, "increase_power"),
		id: "commanders_tent"
	},
	{
		name: t("encounters.assassins_hideout.name"),
		pic: "ui/assassin",
		description: t("encounters.assassins_hideout.desc"),
		onClick: openHeroShopCallback(container, "increase_critical"),
		id: "assassins_hideout"
	},
	{
		name: t("encounters.power_distributor.name"),
		pic: "ui/power_distributor",
		description: t("encounters.power_distributor.desc"),
		minRound: 3,
		onClick: orbShopCallback(state, container, ["distribute_power_orb"]),
		id: "power_distributor"
	},
	{
		name: t("encounters.power_absorber.name"),
		pic: "ui/power_absorber",
		description: t("encounters.power_absorber.desc"),
		minRound: 3,
		onClick: orbShopCallback(state, container, ["absorb_power_orb"]),
		id: "power_absorber"
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
		onClick: singleHeroOfRankShop(container, 2),
		id: "silver_shop"
	},
	{
		name: t("encounters.gold_shop"),
		pic: "ui/gold_medal",
		description: t("encounters.gold_shop_desc"),
		minRound: MIN_ROUND_FOR_GOLD_SHOP,
		onClick: singleHeroOfRankShop(container, 3),
		id: "gold_shop"
	}
];

function improveType(state: State, container: Phaser.GameObjects.Container, pic: string, type: string) {
	return {
		name: t("encounters.improve_type.name", { type }),
		pic,
		minRound: 4,
		description: t("encounters.improve_type.desc", { type }),
		onClick: orbShopCallback(state, container, [
			`increase_power_on_${type}`,
			`decrease_cooldown_on_${type}`,
			`increase_critical_on_${type}`
		]),
		id: `improve_${type}`
	};
}

function orbShopCallback(state: State, container: Phaser.GameObjects.Container, orbs: string[]) {
	return async () => {
		container.destroy(true);
		await openOrbShop(state, orbs);
		PhaseManager.handlePhaseEnded(state);
	};
}

export async function open(state: State, options?: string[]) {
	const container = io.Container();

	let encounters: EncounterItem[] = [];

	if (options) {
		const all = getEncounterItems(state, container);
		encounters = options.map(id => all.find(e => e.id === id)).filter(e => !!e) as EncounterItem[];

		if (MultiplayerManager.getInstance().isMultiplayer) {
			encounters.forEach(e => {
				// Override onClick to send selection to server
				e.onClick = async () => {
					await MultiplayerManager.getInstance().sendOptionSelection(e.id || "", undefined, state);
					container.destroy(true);
					// Wait for server? For now assume server will trigger next phase or we just wait.
					// But we should probably clear the UI.
					// We relying on PhaseManager knowing what to do.
					PhaseManager.handlePhaseEnded(state);
				};
			});
		}
	} else {
		const index = getEncounterItems(state, container).filter(e => {
			const recentIds = state.gameData.recentEncounterIds || [];

			if (e.id && recentIds.includes(e.id)) {
				return false;
			}

			if (e.minRound) {
				return e.minRound <= state.gameData.round;
			}

			if (e.maxRound) {
				return e.maxRound >= state.gameData.round;
			}

			return true;
		});

		encounters = pickRandom(index, 3)
	}

	currentEncounters = encounters;

	const nextRoundCallback = async () => {
		container.destroy(true);
		PhaseManager.handlePhaseEnded(state);
	}

	encounters.forEach((encounter, index) => {

		const width = 700;
		const height = 220;
		const spacing = 240;

		const x = SCREEN_WIDTH - 450;
		const y = 300 + index * spacing;

		createEncounterCard(container, {
			x,
			y,
			width,
			height,
			name: encounter.name,
			pic: encounter.pic,
			description: encounter.description,
			onClick: async () => {
				if (encounter.id) {
					const state = getState();
					state.gameData.recentEncounterIds = state.gameData.recentEncounterIds || [];
					state.gameData.recentEncounterIds.push(encounter.id);
					if (state.gameData.recentEncounterIds.length > 3) {
						state.gameData.recentEncounterIds.shift();
					}
				}
				await encounter.onClick();
			}
		});

	});

	if (!MultiplayerManager.getInstance().isMultiplayer) {
		const btn = createUIButton(t("encounters.skip"),
			vec2(SCREEN_WIDTH - 260, SCREEN_HEIGHT - 50),
			nextRoundCallback
		);

		container.add(btn.container);
	}

}

