import { getState } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { delay } from "../../../Utils/animation";
import { scene } from "../BattlegroundScene";
import { getAllCards } from "@Models/Entities/Card";
import { generateEnemyTeam } from "../generateEnemyTeam";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as GhostStore from "@Models/GhostStore";
import * as Board from "@Models/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as MoraleDisplay from "../MoraleDisplay";
import * as constants from "../../../constants/constants";
import { endShopPhase } from "./ShopPhase";
import * as BoardStatsDisplay from "../BoardStatsDisplay";
import { createUIButton } from "../../../UI/UIButton";
import { vec2 } from "@Models/Geometry";

function createUnitCopy(unit: Unit): Unit {
	return {
		...unit,
		position: { ...unit.position },
		reactions: unit.reactions.map(reaction => ({ ...reaction, effects: reaction.effects.map(effect => ({ ...effect })) })),
		effects: unit.effects.map(effect => ({ ...effect })),
	};
}

export async function transitionToCombatPhase(): Promise<void> {
	const state = getState();
	endShopPhase();
	console.log("Round", state.gameData.round, "Combat Phase Starting.");
	const { enemies } = await setupBattle();

	// Show enemy skill icons when entering combat phase
	BoardStatsDisplay.showCpuStats();


	GhostStore.saveGhostForRound(
		state.gameData.round,
		state.gameData.player.units,
		state.gameData.player.prestige
	);

	showReadyButton({ enemies });

	_initializeMorale();

	Board.setEnemyBoardVisible(true);
	Chara.clearAll();
	// Important: summon the exact Unit instances stored in battleData.units
	// so display components (e.g., charge bars) observe the same objects updated during combat.
	const combatUnits = state.battleData.units;
	combatUnits.forEach(u => {
		Chara.summon(u, false);
	});
}

export async function setupBattle(): Promise<{ enemies: Unit[]; }> {
	const state = getState();
	const cardPool = getAllCards();
	const enemies = generateEnemyTeam(state.gameData.round, cardPool);

	const playerUnitsForBattle = state.gameData.player.units.map(unit => createUnitCopy(unit));

	state.battleData.forces = [
		cpuForce,
		playerForce
	];
	state.battleData.units = [...enemies, ...playerUnitsForBattle];

	await delay(100);


	return { enemies };
}

export async function showReadyButton(payload: { enemies: Unit[] }): Promise<void> {
	const readyButton = createUIButton(
		"Ready",
		vec2(
			constants.SCREEN_WIDTH / 2,
			constants.SCREEN_HEIGHT - 100,
		),
		() => {
			readyButton.destroy();
			handleCombatStartExecution(payload);
		}
	);
}

export async function handleCombatStartExecution(_payload: { enemies: Unit[] }): Promise<void> {


	await delay(300);

	scene.runCombatSystem.runCombatIO();

}

function _initializeMorale(): void {
	playerForce.morale = playerForce.maxMorale;
	cpuForce.morale = cpuForce.maxMorale;

	playerForce.shield = 0;
	cpuForce.shield = 0;

	MoraleDisplay.showBars();

	MoraleDisplay.updateMoraleDisplay({
		forceId: constants.FORCE_ID_PLAYER,
		newMorale: playerForce.morale,
		maxMorale: playerForce.maxMorale,
	});
	MoraleDisplay.updateMoraleDisplay({
		forceId: constants.FORCE_ID_CPU,
		newMorale: cpuForce.morale,
		maxMorale: cpuForce.maxMorale,
	});
	MoraleDisplay.updateShieldBar(
		constants.FORCE_ID_PLAYER,
		playerForce.shield,
		playerForce.maxMorale,
	)
	MoraleDisplay.updateShieldBar(
		constants.FORCE_ID_CPU,
		cpuForce.shield,
		cpuForce.maxMorale,
	);
}
