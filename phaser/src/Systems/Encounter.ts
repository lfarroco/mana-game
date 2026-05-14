import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import { State, getState } from "@Models/State";
import { createEncounterCard } from "@Systems/Components/EncounterCard";
import { getGameController } from "@Core/GameControllerFactory";
import { createLogger } from "@Utils/Logger";
import { getNextEncounterFocusIndex } from "@Systems/Controls/encounterFocusModel";

const logger = createLogger("Encounter");

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
	id?: string;
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
	const nextIndex = getNextEncounterFocusIndex(
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

const noOp = async () => { };

export const getEncounterItems = (
	_state: State,
	_container: Phaser.GameObjects.Container
): EncounterItem[] => [
		{
			name: t("encounters.upgrade_unit.name"),
			pic: "ui/upgrade_unit",
			description: t("encounters.upgrade_unit.desc"),
			onClick: noOp,
			id: "upgrade_unit",
		},
		improveType("ui/improve_damage", "damage"),
		improveType("ui/improve_heal", "heal"),
		improveType("ui/improve_shield", "shield"),
		improveType("ui/toxic", "poison"),
		improveType("ui/improve_regen", "regen"),
		{
			name: t("encounters.armory.name"),
			pic: "ui/armory",
			description: t("encounters.armory.desc"),
			onClick: noOp,
			id: "armory",
		},
		{
			name: t("encounters.healing_tent.name"),
			pic: "ui/improve_heal",
			description: t("encounters.healing_tent.desc"),
			onClick: noOp,
			id: "healing_tent",
		},
		{
			name: t("encounters.frontier_fort.name"),
			pic: "ui/frontier_fort",
			description: t("encounters.frontier_fort.desc"),
			onClick: noOp,
			id: "frontier_fort",
		},
		{
			name: t("encounters.forest_pools.name"),
			pic: "ui/forest_pools",
			description: t("encounters.forest_pools.desc"),
			onClick: noOp,
			id: "forest_pools",
		},
		{
			name: t("encounters.toxic_chamber.name"),
			pic: "ui/toxic",
			description: t("encounters.toxic_chamber.desc"),
			onClick: noOp,
			id: "toxic_chamber",
		},
		{
			name: t("encounters.trial_circuit.name"),
			pic: "ui/trial_circuit",
			description: t("encounters.trial_circuit.desc"),
			onClick: noOp,
			id: "trial_circuit",
		},
		{
			name: t("encounters.trappers_guild.name"),
			pic: "ui/improve_slow",
			description: t("encounters.trappers_guild.desc"),
			onClick: noOp,
			id: "trappers_guild",
		},
		{
			name: t("encounters.thunder_spire.name"),
			pic: "ui/thunder_spire",
			description: t("encounters.thunder_spire.desc"),
			onClick: noOp,
			id: "thunder_spire",
		},
		{
			name: t("encounters.commanders_tent.name"),
			pic: "ui/commander",
			description: t("encounters.commanders_tent.desc"),
			onClick: noOp,
			id: "commanders_tent",
		},
		{
			name: t("encounters.assassins_hideout.name"),
			pic: "ui/assassin",
			description: t("encounters.assassins_hideout.desc"),
			onClick: noOp,
			id: "assassins_hideout",
		},
		{
			name: t("encounters.power_distributor.name"),
			pic: "ui/power_distributor",
			description: t("encounters.power_distributor.desc"),
			minRound: 3,
			onClick: noOp,
			id: "power_distributor",
		},
		{
			name: t("encounters.power_absorber.name"),
			pic: "ui/power_absorber",
			description: t("encounters.power_absorber.desc"),
			minRound: 3,
			onClick: noOp,
			id: "power_absorber",
		},
		{
			name: t("encounters.silver_shop"),
			pic: "ui/silver_medal",
			description: t("encounters.silver_shop_desc"),
			minRound: MIN_ROUND_FOR_SILVER_SHOP,
			maxRound: MIN_ROUND_FOR_GOLD_SHOP - 1,
			onClick: noOp,
			id: "silver_shop",
		},
		{
			name: t("encounters.gold_shop"),
			pic: "ui/gold_medal",
			description: t("encounters.gold_shop_desc"),
			minRound: MIN_ROUND_FOR_GOLD_SHOP,
			onClick: noOp,
			id: "gold_shop",
		},
		{
			name: t("encounters.combat.name"),
			pic: "ui/armory",
			description: t("encounters.combat.desc"),
			onClick: async () => { }, // Overridden in MP
			id: "combat_encounter",
		},
	];

function improveType(pic: string, type: string): EncounterItem {
	return {
		name: t("encounters.improve_type.name", { type }),
		pic,
		minRound: 4,
		description: t("encounters.improve_type.desc", { type }),
		onClick: noOp,
		id: `improve_${type}`,
	};
}

export async function open(state: State, options: string[]) {
	const container = io.Container();
	container.once("destroy", clearEncounterFocus);
	isEncounterSelectionInProgress = false;
	clearEncounterFocus();

	let encounters: EncounterItem[] = [];

	if (options) {
		// Server-provided encounter options (both SP and MP use this now)
		const all = getEncounterItems(state, container);
		encounters = options
			.map((id) => all.find((e) => e.id === id))
			.filter((e) => !!e) as EncounterItem[];

		// Override onClick to use GameController
		encounters.forEach((e) => {
			e.onClick = async () => {
				if (isEncounterSelectionInProgress) {
					return;
				}

				isEncounterSelectionInProgress = true;
				container.destroy(true);

				const controller = getGameController();
				const success = await controller.selectEncounter(e.id || "");
				if (success) {
					return;
				}

				isEncounterSelectionInProgress = false;
			};
		});
	} else {
		logger.warn("No encounter options provided from server");
		return;
	}

	currentEncounters = encounters;

	const nextRoundCallback = async () => {
		clearEncounterFocus();
		container.destroy(true);

		// Use GameController to properly skip encounter phase
		const controller = getGameController();
		await controller.skipPhase();
	};

	encounters.forEach((encounter, index) => {
		const width = ENCOUNTER_CARD_WIDTH;
		const height = ENCOUNTER_CARD_HEIGHT;
		const spacing = ENCOUNTER_CARD_SPACING;

		const x = SCREEN_WIDTH - ENCOUNTER_CARD_X_OFFSET;
		let y = ENCOUNTER_CARD_BASE_Y + index * spacing;

		if (encounters.length === 1) {
			y = SCREEN_HEIGHT / 2;
		}

		const card = createEncounterCard(container, {
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
	});

	initializeEncounterFocusTargets();

	// Only show skip button if:
	// 1. Feature is enabled by controller (not multiplayer)
	// 2. Not showing combat_encounter (pre-combat phase)
	const controller = getGameController();
	const isCombatEncounter = encounters.length === 1 && encounters[0].id === "combat_encounter";
	if (controller.isFeatureEnabled("skip_encounter") && !isCombatEncounter) {
		const btn = createUIButton(
			t("encounters.skip"),
			vec2(SCREEN_WIDTH - 260, SCREEN_HEIGHT - 50),
			nextRoundCallback
		);

		container.add(btn.container);
	}
}
