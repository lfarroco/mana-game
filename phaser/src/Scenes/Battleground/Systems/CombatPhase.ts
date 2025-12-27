import { getCurrentScene, State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { delay } from "@Utils/animation";
import { getAllCards } from "@Models/Entities/Card";
import { generateEnemyTeam } from "../generateEnemyTeam";
import { makeForce, playerForce } from "@Models/Entities/Force";
import * as GhostStore from "@Models/GhostStore";
import * as Board from "@Models/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as constants from "@Constants/constants";
import { createUIButton, Button } from "../../../Components/UIButton";
import { vec2 } from "@Models/Geometry";
import { runCombatIO } from "../RunCombatIO";
import { t } from "@i18n/i18n";
import { BattlegroundScene } from "../BattlegroundScene";

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

export async function transitionToCombatPhase(state: State): Promise<void> {
	console.log("Round", state.gameData.round, "Combat Phase Starting.");
	const { enemies } = await setupBattle(state);

	GhostStore.saveGhostForRound(
		state.gameData.round,
		state.gameData.player.units,
		state.gameData.player.lives
	);

	const readyButton = showReadyButton({ enemies });
	readyButton.disable();

	Board.setEnemyBoardVisible(true);
	Chara.clearAll();

	const combatUnits = state.battleData.units;
	const summonPromises = combatUnits.map((u) => Chara.summon(u, false));

	await Promise.all(summonPromises);

	readyButton.enable();
}

export async function setupBattle(state: State): Promise<{ enemies: Unit[] }> {
	state.battleData.forces = [makeForce(constants.FORCE_ID_CPU), { ...playerForce(state), id: constants.FORCE_ID_PLAYER }];

	const cardPool = getAllCards();
	const enemies = generateEnemyTeam(state, state.gameData.round, cardPool);

	const playerUnitsForBattle = state.gameData.player.units.map((unit) => ({
		...createUnitCopy(unit),
		force: constants.FORCE_ID_PLAYER,
	}));

	state.battleData.units = [...enemies, ...playerUnitsForBattle];

	await delay(100);

	return { enemies };
}

export function showReadyButton(payload: { enemies: Unit[] }): Button {
	const readyButton = createUIButton(
		t("ui.ready"),
		vec2(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100),
		() => {
			readyButton.container.destroy();
			handleCombatStartExecution(payload);
		}
	);
	return readyButton;
}

export async function handleCombatStartExecution(_payload: { enemies: Unit[] }): Promise<void> {
	await delay(300);

	const scene = getCurrentScene() as BattlegroundScene;
	scene.combatRunner = runCombatIO();
}

