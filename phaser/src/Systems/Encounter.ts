import * as io from "@PhaserIO";
import * as UIButton from "Client/Components/UIButton";
import * as i18n from "@i18n/i18n";
import * as Geometry from "@Models/Geometry";
import * as constants from "@Constants/constants";
import * as State from "@Models/State";
import * as EncounterCard from "@Systems/Components/EncounterCard";
import * as GameController from "@Core/GameController";
import * as encounterFocusModel from "@Systems/Controls/encounterFocusModel";
import { SessionData } from "@Core/Types";

const MIN_ROUND_FOR_SILVER_SHOP = 1;
const MIN_ROUND_FOR_GOLD_SHOP = 6;

// Encounter card display layout constants
const ENCOUNTER_CARD_WIDTH = 700;
const ENCOUNTER_CARD_HEIGHT = 220;
const ENCOUNTER_CARD_SPACING = 240;
const ENCOUNTER_CARD_X_OFFSET = 450;
const ENCOUNTER_CARD_BASE_Y = 300;

type EncounterItem = {
	name: string;
	pic: string;
	description: string;
	onClick: () => Promise<void>;
	minRound?: number;
	maxRound?: number;
	id: string;
};

let currentEncounters: EncounterItem[] = [];
let isEncounterSelectionInProgress = false;
let focusedEncounterIndex: number | null = null;

export type EncounterFocusEntry = {
	setFocused: (focused: boolean) => void;
	activate: () => Promise<void>;
	startHoldAction?: () => Promise<boolean> | boolean;
	updateHoldAction?: (payload: { boardTile: Vec2 | null }) => Promise<boolean> | boolean;
	releaseHoldAction?: (payload: { boardTile: Vec2 | null }) => Promise<boolean> | boolean;
};

let encounterFocusEntries: EncounterFocusEntry[] = [];

const clearEncounterFocus = () => {
	encounterFocusEntries.forEach((entry) => entry.setFocused(false));
	encounterFocusEntries = [];
	focusedEncounterIndex = null;
};

const setEncounterFocus = (nextIndex: number | null): void => {
	if (encounterFocusEntries.length === 0) {
		focusedEncounterIndex = null;
		return;
	}

	encounterFocusEntries.forEach((entry, index) => entry.setFocused(index === nextIndex));
	focusedEncounterIndex = nextIndex;
};

export const hasEncounterFocusTargets = (): boolean => encounterFocusEntries.length > 0;

export const resetEncounterFocusTargets = (): void => {
	clearEncounterFocus();
};

export const registerEncounterFocusTarget = (entry: EncounterFocusEntry): void => {
	encounterFocusEntries.push(entry);
};

export const initializeEncounterFocusTargets = (): void => {
	// Focus is set lazily by ensureEncounterFocus() when the user navigates to the encounter layer.
	// Do not auto-focus here to avoid cards appearing active before any keyboard interaction.
};

export const getEncounterFocusCount = (): number => encounterFocusEntries.length;

export const getFocusedEncounterIndex = (): number | null => focusedEncounterIndex;

export const hasFocusedEncounterTarget = (): boolean => {
	return (
		focusedEncounterIndex !== null &&
		focusedEncounterIndex >= 0 &&
		focusedEncounterIndex < encounterFocusEntries.length
	);
};

export const ensureEncounterFocus = (): boolean => {
	if (encounterFocusEntries.length === 0) {
		return false;
	}

	if (focusedEncounterIndex === null) {
		setEncounterFocus(0);
	}

	return hasFocusedEncounterTarget();
};

export const blurEncounterFocus = (): void => {
	setEncounterFocus(null);
};

export const focusEncounterIndex = (index: number): boolean => {
	if (encounterFocusEntries.length === 0 || index < 0 || index >= encounterFocusEntries.length) {
		return false;
	}

	setEncounterFocus(index);
	return true;
};

export const navigateEncounterFocus = (direction: "up" | "down" | "left" | "right"): boolean => {
	const nextIndex = encounterFocusModel.getNextEncounterFocusIndex(
		focusedEncounterIndex,
		encounterFocusEntries.length,
		direction
	);

	if (nextIndex === null) {
		return false;
	}

	setEncounterFocus(nextIndex);
	return true;
};

export const confirmEncounterFocus = async (): Promise<boolean> => {
	if (encounterFocusEntries.length === 0) {
		return false;
	}

	if (!ensureEncounterFocus() || focusedEncounterIndex === null) {
		return false;
	}

	await encounterFocusEntries[focusedEncounterIndex].activate();
	return true;
};

export const startEncounterFocusHoldAction = async (): Promise<boolean> => {
	if (encounterFocusEntries.length === 0) {
		return false;
	}

	if (!ensureEncounterFocus() || focusedEncounterIndex === null) {
		return false;
	}

	const entry = encounterFocusEntries[focusedEncounterIndex];
	if (!entry.startHoldAction) {
		return false;
	}

	return await entry.startHoldAction();
};

export const releaseEncounterFocusHoldAction = async (payload: {
	boardTile: Vec2 | null;
}): Promise<boolean> => {
	if (encounterFocusEntries.length === 0) {
		return false;
	}

	if (!ensureEncounterFocus() || focusedEncounterIndex === null) {
		return false;
	}

	const entry = encounterFocusEntries[focusedEncounterIndex];
	if (!entry.releaseHoldAction) {
		return false;
	}

	return await entry.releaseHoldAction(payload);
};

export const updateEncounterFocusHoldAction = async (payload: {
	boardTile: Vec2 | null;
}): Promise<boolean> => {
	if (encounterFocusEntries.length === 0) {
		return false;
	}

	if (!ensureEncounterFocus() || focusedEncounterIndex === null) {
		return false;
	}

	const entry = encounterFocusEntries[focusedEncounterIndex];
	if (!entry.updateHoldAction) {
		return false;
	}

	return await entry.updateHoldAction(payload);
};

export async function chooseEncounter(index: number) {
	if (currentEncounters[index]) {
		await currentEncounters[index].onClick();
		return `Chose encounter ${index}: ${currentEncounters[index].name}`;
	}
	return `Invalid encounter index: ${index}. Available: ${currentEncounters.length}`;
}

const noop = async () => { };

export const getEncounterItems = (
	_state: State.State,
	_container: Phaser.GameObjects.Container
): EncounterItem[] => [
		{
			name: i18n.t("encounters.upgrade_unit.name"),
			pic: "ui/upgrade_unit",
			description: i18n.t("encounters.upgrade_unit.desc"),
			onClick: noop,
			id: "upgrade_unit",
		},
		improveType("ui/improve_damage", "damage"),
		improveType("ui/improve_heal", "heal"),
		improveType("ui/improve_shield", "shield"),
		improveType("ui/toxic", "poison"),
		improveType("ui/improve_regen", "regen"),
		{
			name: i18n.t("encounters.armory.name"),
			pic: "ui/armory",
			description: i18n.t("encounters.armory.desc"),
			onClick: noop,
			id: "armory",
		},
		{
			name: i18n.t("encounters.healing_tent.name"),
			pic: "ui/improve_heal",
			description: i18n.t("encounters.healing_tent.desc"),
			onClick: noop,
			id: "healing_tent",
		},
		{
			name: i18n.t("encounters.frontier_fort.name"),
			pic: "ui/frontier_fort",
			description: i18n.t("encounters.frontier_fort.desc"),
			onClick: noop,
			id: "frontier_fort",
		},
		{
			name: i18n.t("encounters.forest_pools.name"),
			pic: "ui/forest_pools",
			description: i18n.t("encounters.forest_pools.desc"),
			onClick: noop,
			id: "forest_pools",
		},
		{
			name: i18n.t("encounters.toxic_chamber.name"),
			pic: "ui/toxic",
			description: i18n.t("encounters.toxic_chamber.desc"),
			onClick: noop,
			id: "toxic_chamber",
		},
		{
			name: i18n.t("encounters.trial_circuit.name"),
			pic: "ui/trial_circuit",
			description: i18n.t("encounters.trial_circuit.desc"),
			onClick: noop,
			id: "trial_circuit",
		},
		{
			name: i18n.t("encounters.trappers_guild.name"),
			pic: "ui/improve_slow",
			description: i18n.t("encounters.trappers_guild.desc"),
			onClick: noop,
			id: "trappers_guild",
		},
		{
			name: i18n.t("encounters.thunder_spire.name"),
			pic: "ui/thunder_spire",
			description: i18n.t("encounters.thunder_spire.desc"),
			onClick: noop,
			id: "thunder_spire",
		},
		{
			name: i18n.t("encounters.commanders_tent.name"),
			pic: "ui/commander",
			description: i18n.t("encounters.commanders_tent.desc"),
			onClick: noop,
			id: "commanders_tent",
		},
		{
			name: i18n.t("encounters.assassins_hideout.name"),
			pic: "ui/assassin",
			description: i18n.t("encounters.assassins_hideout.desc"),
			onClick: noop,
			id: "assassins_hideout",
		},
		{
			name: i18n.t("encounters.power_distributor.name"),
			pic: "ui/power_distributor",
			description: i18n.t("encounters.power_distributor.desc"),
			minRound: 3,
			onClick: noop,
			id: "power_distributor",
		},
		{
			name: i18n.t("encounters.power_absorber.name"),
			pic: "ui/power_absorber",
			description: i18n.t("encounters.power_absorber.desc"),
			minRound: 3,
			onClick: noop,
			id: "power_absorber",
		},
		{
			name: i18n.t("encounters.silver_shop"),
			pic: "ui/silver_medal",
			description: i18n.t("encounters.silver_shop_desc"),
			minRound: MIN_ROUND_FOR_SILVER_SHOP,
			maxRound: MIN_ROUND_FOR_GOLD_SHOP - 1,
			onClick: noop,
			id: "silver_shop",
		},
		{
			name: i18n.t("encounters.gold_shop"),
			pic: "ui/gold_medal",
			description: i18n.t("encounters.gold_shop_desc"),
			minRound: MIN_ROUND_FOR_GOLD_SHOP,
			onClick: noop,
			id: "gold_shop",
		},
		{
			name: i18n.t("encounters.combat.name"),
			pic: "ui/armory",
			description: i18n.t("encounters.combat.desc"),
			onClick: noop,
			id: "combat_encounter",
		},
	];

function improveType(pic: string, type: string): EncounterItem {
	return {
		name: i18n.t("encounters.improve_type.name", { type }),
		pic,
		minRound: 4,
		description: i18n.t("encounters.improve_type.desc", { type }),
		onClick: noop,
		id: `improve_${type}`,
	};
}

export async function displayOptions() {
	return new Promise<SessionData>((resolve) => {

		const container = io.Container();
		io.OnceDestroyed(container, clearEncounterFocus);

		isEncounterSelectionInProgress = false;
		clearEncounterFocus();

		let encounters: EncounterItem[] = [];

		const all = getEncounterItems(state, container);
		encounters = state.session.current_options
			.reduce((acc, option) => {
				const encounter = all.find((e) => e.id === option.id);
				if (encounter) {
					return acc.concat([encounter]);
				}
				return acc;
			}, [] as EncounterItem[]);

		encounters.forEach((e) => {
			e.onClick = async () => {
				if (isEncounterSelectionInProgress) {
					return;
				}

				isEncounterSelectionInProgress = true;
				container.destroy(true);

				const response = await GameController.selectEncounter(e.id);

				resolve(response);

			};
		});

		currentEncounters = encounters;

		const nextRoundCallback = async () => {
			clearEncounterFocus();
			container.destroy(true);

			// Use GameController to properly skip encounter phase
			const response = await GameController.skipPhase();
			resolve(response);
		};

		encounters.forEach(async (encounter, index) => {
			const width = ENCOUNTER_CARD_WIDTH;
			const height = ENCOUNTER_CARD_HEIGHT;
			const spacing = ENCOUNTER_CARD_SPACING;

			const x = constants.SCREEN_WIDTH - ENCOUNTER_CARD_X_OFFSET;
			let y = ENCOUNTER_CARD_BASE_Y + index * spacing;

			if (encounters.length === 1) {
				y = constants.SCREEN_HEIGHT / 2;
			}

			const card = EncounterCard.createEncounterCard(container, {
				x: x + width + 200,
				y,
				width,
				height,
				name: encounter.name,
				pic: encounter.pic,
				description: encounter.description,
				onClick: async () => {
					if (encounter.id) {
						state.session.encounter_history = state.session.encounter_history || [];
						state.session.encounter_history.push(encounter.id);
						if (state.session.encounter_history.length > 3) {
							state.session.encounter_history.shift();
						}
					}
					await encounter.onClick();
				},
			});

			registerEncounterFocusTarget({
				setFocused: card.setFocused,
				activate: card.activate,
			});

			await io.Delay(100 * index)
			io.Tween({
				targets: card.container,
				x,
				duration: 300,
				ease: "Power2",
			});
		});

		initializeEncounterFocusTargets();

		// Only show skip button if:
		// 1. Not showing combat_encounter (pre-combat phase)
		const isCombatEncounter = encounters[0].id === "combat_encounter";
		if (!isCombatEncounter) {
			const btn = UIButton.createUIButton({
				text: i18n.t("encounters.skip"),
				position: Geometry.vec2(constants.SCREEN_WIDTH - 260, constants.SCREEN_HEIGHT - 50),
				callback: nextRoundCallback,
			});

			container.add(btn.container);
		}

	});

}
