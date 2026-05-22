import { Unit, makeUnit } from "@Models/Entities/Unit";
import { vec2 } from "@Models/Geometry";
import { CardDefinition, getBattleCore } from "@Models/Entities/Card";
import { playerForce, cpuForce } from "@Models/Entities/Force";
import * as constants from "@Constants/constants";
import * as Chara from "@Systems/Chara/Chara";
import * as Systems from "@Systems/BattlegroundSystems";
import { processOwnedUnitMoveRequest } from "@Systems/Chara/input";
import { getGameController } from "@Core/GameControllerFactory";
import { startGame } from "@Game/effects/startGame";
import { State } from "@Models/State";
import * as StatsStore from "@Models/StatsStore";
import CrystalSelectionScene from "Client/Scenes/CrystalSelection/CrystalSelectionScene";
import { handleCombatStartExecution } from "@Systems/CombatPhase";
import { chooseEncounter as executeEncounterChoice } from "@Systems/Encounter";
import { getCurrentScene, getState } from "@Models/State";
import { activeButtons } from "@Components/UIButton";
import { ActionPayload, SessionData } from "@Core/Types";
import { getServerAdapter } from "@Core/ServerFactory";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("DebugController");

export function getCurrentSceneName(): string {
	const scene = getCurrentScene();
	return scene ? scene.scene.key : "";
}

export function getCurrentPhase(): string {
	const state = getState();
	if (!state || !state.session) return "";
	// Return the actual phase from the session, not derived from step
	// This allows tests to set arbitrary phases
	return state.session.phase;
}

export function clickHeroInShop(slotIndex: number): string {
	const chara = Systems.Shop.HeroShop.getShopCharaBySlot(slotIndex);
	if (!chara) {
		return `Error: No hero Chara found in shop slot ${slotIndex}`;
	}
	const unitToPurchase = Chara.getUnit(chara);

	if (!Chara.isShopItem(unitToPurchase.id)) {
		return `Error: Hero in slot ${slotIndex} (Chara ID: ${Chara.getId(chara)}) is not a shop item or already purchased`;
	}

	Systems.Shop.events.itemClickPurchaseRequested(
		{ ...unitToPurchase },
		Chara.getId(chara),
		(chara as Chara.Chara).x,
		(chara as Chara.Chara).y
	);

	return `Emitted SHOP_ITEM_CLICK_PURCHASE_REQUESTED for hero in shop slot ${slotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${Chara.getId(chara)}). Purchase processing is asynchronous`;
}

export function buyAndPlaceHero(shopSlotIndex: number, boardX: number, boardY: number): string {
	const chara = Systems.Shop.HeroShop.getShopCharaBySlot(shopSlotIndex);
	if (!chara) {
		return `Error: No hero Chara found in shop slot ${shopSlotIndex}`;
	}
	const unitToPurchase = Chara.getUnit(chara);

	if (!Chara.isShopItem(unitToPurchase.id)) {
		return `Error: Hero in slot ${shopSlotIndex} (Chara ID: ${Chara.getId(chara)}) is not a shop item or already purchased`;
	}

	Systems.Shop.events.itemDragPurchaseRequested(
		unitToPurchase,
		Chara.getId(chara),
		vec2(boardX, boardY),
		(chara as Chara.Chara).x,
		(chara as Chara.Chara).y
	);

	return `Emitted SHOP_ITEM_DRAG_PURCHASE_REQUESTED for hero in shop slot ${shopSlotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${Chara.getId(chara)}) to board (${boardX},${boardY}). Purchase and placement are asynchronous`;
}

export async function clickNextRound(): Promise<string> {
	const controller = getGameController();
	const success = await controller.skipPhase();
	if (success) {
		return "Requested phase skip via GameController. Transition should follow server rules.";
	}
	return "Phase skip rejected by GameController.";
}

export function moveUnitOnBoard(
	unitId: string,
	targetBoardX: number,
	targetBoardY: number
): string {
	const unit = getState().session.team.units.find((u) => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board`;
	}

	let dragStartX = 0;
	let dragStartY = 0;

	const chara = Chara.getCharaById(unitId);

	dragStartX = chara.x;
	dragStartY = chara.y;

	processOwnedUnitMoveRequest(unitId, vec2(targetBoardX, targetBoardY), dragStartX, dragStartY);

	return `Emitted OWNED_UNIT_MOVE_REQUESTED for unit ${unitId} to board (${targetBoardX},${targetBoardY}). Move/swap processing is asynchronous`;
}

export function discardUnitFromBoard(unitId: string): string {
	const unit = getState().session.team.units.find((u) => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board. Cannot discard`;
	}

	Systems.Shop.events.ownedUnitSold(unitId);

	return `Discard request processed for unit ${unitId}. State and visuals will update asynchronously`;
}

export const isShopVisible = (): boolean => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const ShopPanel = require("@Systems/Shop/ShopPanel") as typeof import("@Systems/Shop/ShopPanel");
	return !!(ShopPanel.container && ShopPanel.container.visible);
};

export function getShopItemCost(): number {
	return constants.SHOP_ITEM_PURCHASE_COST;
}

export function getMaxPartySize(): number {
	return constants.MAX_PARTY_SIZE;
}

export function getShopHeroes(): CardDefinition[] {
	return Systems.Shop.HeroShop.getDisplayedHeroCardDefinitions();
}

export function getPlayerBoardUnits(): Unit[] {
	return getState().session.team?.units || [];
}

export function logGameState(): void {
	logger.debug("Current Game State (DebugController):", {
		shopHeroes: getShopHeroes().map((c) => c?.id),
		playerUnits: getPlayerBoardUnits().map((u) => ({
			id: u.id,
			cardId: u.cardId,
			x: u.position.x,
			y: u.position.y,
		})),
		currentRound: getState().session?.round,
	});
}

export async function addUnitToPlayerBoard(
	cardId: string,
	boardX: number,
	boardY: number
): Promise<string> {
	const newUnit: Unit = {
		id: `test-unit-${Date.now()}-${Math.random()}`,
		cardId: cardId,
		pic: `${cardId}.png`,
		force: getState().session.player_id,
		position: vec2(boardX, boardY),
		power: 25,
		bonusPower: 0,
		life: 0,
		maxLife: 25,
		cooldown: 100,
		critical: 0,
		evade: 5,
		rank: 1,
		shield: 0,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore: false,
	};

	getState().session.team.units.push(newUnit);

	await Chara.summon(newUnit, true);

	return `Added unit ${cardId} (ID: ${newUnit.id}) to board position (${boardX}, ${boardY})`;
}

export function clickGameStart() {
	startGame(false);
}

export function clickNewRun() {
	startGame(false);
	return "Started new run sequence";
}

export function selectCrystal(index: number) {
	const scene = getCurrentScene();
	if (scene instanceof CrystalSelectionScene) {
		scene.currentIndex = index;
		scene.updateDisplay();
		return `Selected crystal at index ${index}`;
	}
	return "Error: Current scene is not CrystalSelectionScene";
}

export function confirmCrystalSelection() {
	const scene = getCurrentScene();
	if (scene instanceof CrystalSelectionScene) {
		scene.startGameWithCrystal();
		return "Confirmed crystal selection";
	}
	return "Error: Current scene is not CrystalSelectionScene";
}

export function clickReady() {
	handleCombatStartExecution({ enemies: [] });
	return "Executed combat start (Ready clicked)";
}

export function chooseEncounter(index: number) {
	return executeEncounterChoice(index);
}

export const gameActions = {
	purchaseUnit: async (cardId: string, targetSlot?: number) => {
		return await getGameController().purchaseUnit(cardId, targetSlot);
	},
	sellUnit: async (unitId: string) => {
		return await getGameController().sellUnit(unitId);
	},
	updateTeam: async (team: { units: Unit[] }) => {
		return await getGameController().updateTeam(team);
	},
	handleAction: async (actionId: string, payload?: ActionPayload) => {
		return await getGameController().handleAction(actionId, payload);
	},
	skipPhase: async () => {
		return await getGameController().skipPhase();
	},
};

export async function summon(
	forceId: string,
	cardId: string,
	x: number = 0,
	y: number = 0
): Promise<string> {
	const state = getState();

	// Validate force ID
	if (forceId !== constants.FORCE_ID_PLAYER && forceId !== constants.FORCE_ID_CPU) {
		return `Error: Invalid force ID "${forceId}". Use "${constants.FORCE_ID_PLAYER}" or "${constants.FORCE_ID_CPU}"`;
	}

	// Create the unit
	const newUnit = makeUnit(forceId, cardId, vec2(x, y));

	// Add to the appropriate force's units
	if (forceId === constants.FORCE_ID_PLAYER) {
		state.session.team.units.push(newUnit);
	} else {
		// CPU units go into battleData.units during battles
		state.battleData.units.push(newUnit);
	}

	// Visually summon the character
	await Chara.summon(newUnit, true);

	return `Summoned ${cardId} (ID: ${newUnit.id}) to ${forceId} board at position (${x}, ${y})`;
}

export async function triggerGameComplete(state: State, wins: number = 0): Promise<void> {
	const tooltip = await import("@Components/Tooltip");
	const { displayGameComplete } = await import("../Battleground/Results/GameCompleteUI");

	state.session.wins = wins;
	if (wins < 10) {
		state.session.losses = 4; // Assuming 0 lives means 4 losses
	} else {
		state.session.losses = 0; // Assuming 4 lives means 0 losses
	}

	if (state.session.team.units.length === 0) {
		state.session.team.units = [
			{
				id: "test-unit-1",
				cardId: "fortress",
				pic: "boss_city",
				force: "PLAYER",
				position: { x: 0, y: 0 },
				rank: 1,
				power: 10,
				bonusPower: 0,
				life: 100,
				maxLife: 100,
				shield: 0,
				cooldown: 100,
				evade: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: false,
			},
			{
				id: "test-unit-2",
				cardId: "parry_master",
				pic: "neutral_swordofakrane",
				force: "PLAYER",
				position: { x: 1, y: 1 },
				rank: 1,
				power: 10,
				bonusPower: 0,
				life: 80,
				maxLife: 80,
				shield: 0,
				cooldown: 100,
				evade: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: false,
			},
			{
				id: "test-unit-3",
				cardId: "parry_master",
				pic: "neutral_swordofakrane",
				force: "PLAYER",
				position: { x: 2, y: 2 },
				rank: 1,
				power: 10,
				bonusPower: 0,
				life: 80,
				maxLife: 80,
				shield: 0,
				cooldown: 100,
				evade: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: false,
			},
		];
	}

	tooltip.init();

	displayGameComplete(state, wins, state.session.team.units, false);
}

export function defeatCpu(state: State): string {
	const core = getBattleCore(state)(cpuForce(state).id);
	if (!core) return "Error: CPU core not found";
	core.life = 0;
	return "CPU core life set to 0. Victory imminent.";
}

export function defeatPlayer(state: State): string {
	const core = getBattleCore(state)(playerForce(state).id);
	if (!core) return "Error: Player core not found";
	core.life = 0;
	return "Player core life set to 0. Defeat imminent.";
}

export async function setWins(wins: number): Promise<string> {
	const { updateWinsDisplay } = await import("Client/Scenes/Battleground/Components/winsDisplay");
	getState().session.wins = wins;
	updateWinsDisplay(wins);
	return `Wins set to ${wins}`;
}

export function unlockUnit(unitId: string): string {
	StatsStore.unlockUnit(unitId);
	return `Unit ${unitId} unlocked (pending confirmation). Go to main menu to confirm.`;
}

export function lockUnit(unitId: string): string {
	StatsStore.lockUnit(unitId);
	return `Unit ${unitId} locked.`;
}

export async function runBalanceAnalysis() {
	const { BalanceAnalysis } = await import("@Utils/BalanceAnalysis");
	BalanceAnalysis.run();
	return "Balance analysis executed. Check console for results.";
}

export async function setSpeed(speed: number): Promise<string> {
	const OptionsStore = await import("@Models/OptionsStore");
	OptionsStore.setOption("speed", speed);
	return `Game speed set to ${speed}`;
}

export function clickButton(textToFind: string): string {
	const registry =
		((window as unknown as Record<string, unknown>)._activeButtons as
			| typeof activeButtons
			| undefined) || activeButtons;
	const key = textToFind.toUpperCase();
	if (registry[key]) {
		registry[key]();
		return `Clicked button "${textToFind}" via registry`;
	}
	const keys = Object.keys(registry);
	return `Error: Button "${textToFind}" not found in registry. Available: ${keys.join(", ")}`;
}

/**
 * Start the battleground scene with an arbitrary session state.
 * This is useful for e2e testing to set up specific game scenarios.
 *
 * @param session - The session data to use for the battleground scene.
 *                  Can be a partial session that will be merged with defaults.
 * @returns A promise that resolves to a string indicating success or error.
 */
export async function startBattlegroundWithSession(session: Partial<SessionData>): Promise<string> {
	const state = getState();

	// Create a complete session by merging with defaults
	const defaultSession: SessionData = {
		id: `test-session-${Date.now()}`,
		player_id: `test-player-${Date.now()}`,
		phase: "encounter",
		round: 1,
		step: 1,
		seed: Math.random().toString(36).substring(7),
		initial_seed: Math.random().toString(36).substring(7),
		action_log: [],
		current_options: null,
		team: { units: [] },
		wins: 0,
		losses: 0,
		encounter_history: [],
		runStats: {
			damageDealt: 0,
			poisonDealt: 0,
			shieldDealt: 0,
			regenDealt: 0,
			healDealt: 0,
			mostPowerfulUnit: null,
			totalUnitsRecruited: 0,
			unitUsage: {},
		},
	};

	// Merge the provided session with defaults
	const completeSession: SessionData = {
		...defaultSession,
		...session,
		// Deep merge for nested objects - preserve all team properties while merging units
		team: session.team
			? { ...defaultSession.team, ...session.team, units: [...(session.team.units || [])] }
			: defaultSession.team,
		runStats: session.runStats
			? { ...defaultSession.runStats, ...session.runStats }
			: defaultSession.runStats,
	};

	// Update the global state with the new session
	state.session = completeSession;

	// Restore session into SessionManager via the server adapter
	// Note: Using type assertion to access sessionManager, which is consistent with loadGame.ts
	// This is only for debugging/testing purposes where we need direct session manipulation
	const server = getServerAdapter();
	if ("sessionManager" in server) {
		(
			server as unknown as {
				sessionManager: { updateSession(id: string, session: SessionData): void };
			}
		).sessionManager.updateSession(completeSession.player_id, completeSession);
	}

	// Start the battleground scene with the state
	const scene = getCurrentScene();
	scene.scene.start(constants.SCENE_KEYS.BATTLEGROUND, { state });

	return `Started battleground scene with session: phase=${completeSession.phase}, round=${completeSession.round}, team size=${completeSession.team.units.length}`;
}
