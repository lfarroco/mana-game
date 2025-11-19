import { getState } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { delay } from "@Utils/animation";
import { scene } from "../BattlegroundScene";
import { getAllCards } from "@Models/Entities/Card";
import { generateEnemyTeam } from "../generateEnemyTeam";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as GhostStore from "@Models/GhostStore";
import * as Board from "@Models/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as constants from "@Constants/constants";
import { createUIButton } from "../../../Components/UIButton";
import { vec2 } from "@Models/Geometry";
import { createForceStats } from "../ForceStats";

function createUnitCopy(unit: Unit): Unit {
	return {
		...unit,
		position: { ...unit.position },
		reactions: unit.reactions.map((reaction) => ({
			...reaction,
			effects: reaction.effects.map((effect) => ({ ...effect })),
		})),
		effects: unit.effects.map((effect) => ({ ...effect })),
	};
}

export async function transitionToCombatPhase(): Promise<void> {
	const state = getState();
	console.log("Round", state.gameData.round, "Combat Phase Starting.");
	const { enemies } = await setupBattle();

	GhostStore.saveGhostForRound(
		state.gameData.round,
		state.gameData.player.units,
		state.gameData.player.lives
	);

	showReadyButton({ enemies });

	Board.setEnemyBoardVisible(true);
	Chara.clearAll();
	// Important: summon the exact Unit instances stored in battleData.units
	// so display components (e.g., charge bars) observe the same objects updated during combat.
	const combatUnits = state.battleData.units;
	combatUnits.forEach((u) => {
		Chara.summon(u, false);
	});

	createForceStats(constants.FORCE_ID_PLAYER);
	createForceStats(constants.FORCE_ID_CPU);
}

export async function setupBattle(): Promise<{ enemies: Unit[] }> {
	const state = getState();
	const cardPool = getAllCards();
	const enemies = generateEnemyTeam(state.gameData.round, cardPool);

	const playerUnitsForBattle = state.gameData.player.units.map((unit) => createUnitCopy(unit));

	state.battleData.forces = [cpuForce, playerForce];
	state.battleData.units = [...enemies, ...playerUnitsForBattle];

	await delay(100);

	return { enemies };
}

export async function showReadyButton(payload: { enemies: Unit[] }): Promise<void> {
	const readyButton = createUIButton(
		"Ready",
		vec2(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100),
		() => {
			readyButton.container.destroy();
			handleCombatStartExecution(payload);
		}
	);
}

export async function handleCombatStartExecution(_payload: { enemies: Unit[] }): Promise<void> {
	await delay(300);

	scene.runCombatSystem.runCombatIO();
}
