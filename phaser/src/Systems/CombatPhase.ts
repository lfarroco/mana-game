import { getCurrentScene, State } from "@Models/State";
import { CombatState } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { delay } from "@Utils/animation";
import { makeForce } from "@Models/Entities/Force";
import * as GhostStore from "@Models/GhostStore";
import * as Board from "@Models/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as constants from "@Constants/constants";
import { createUIButton, Button } from "@Components/UIButton";
import { vec2 } from "@Models/Geometry";
import { runCombatIO } from "Client/Scenes/Battleground/RunCombatIO";
import { t } from "@i18n/i18n";
import { BattlegroundScene } from "Client/Scenes/Battleground/BattlegroundScene";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("CombatPhase");

// Combat phase transition delay
const COMBAT_START_DELAY_MS = 300;

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

export async function transitionToCombatPhase(
	state: State,
	combatState?: CombatState
): Promise<void> {
	logger.debug(`Round ${state.session.round}: Combat Phase Starting.`);

	// Disable board input immediately - combat outcome is already pre-calculated
	Board.setIsInputEnabled(false);

	let enemies: Unit[];

	if (combatState && combatState.enemyTeam) {
		// Use server-provided enemy team (from local or remote server)
		logger.debug("Using server-provided enemy team");
		enemies = combatState.enemyTeam;

		// Initialize forces array for combat
		state.battleData.forces = [
			makeForce(constants.FORCE_ID_CPU),
			{
				id: constants.FORCE_ID_PLAYER,
				name: "",
				color: "",
				units: state.session.team.units,
				lives: 4 - state.session.losses,
				wins: state.session.wins,
				losses: state.session.losses,
			},
		];

		// If we have full combat state with units, use those
		if (combatState.units) {
			state.battleData.units = combatState.units;
		} else {
			// Otherwise, combine player units with enemy team
			const playerUnitsForBattle = state.session.team.units.map((unit) => ({
				...createUnitCopy(unit),
				force: constants.FORCE_ID_PLAYER,
			}));
			state.battleData.units = [...enemies, ...playerUnitsForBattle];
		}
	} else {
		// This should not happen if migration is complete
		logger.error("No combat state provided for combat phase");
		enemies = [];
	}

	GhostStore.saveGhostForRound(
		state.session.round,
		state.session.team.units,
		4 - state.session.losses
	);

	Board.setEnemyBoardVisible(true);
	Chara.clearAll();

	const combatUnits = state.battleData.units;
	const summonPromises = combatUnits.map((u) => Chara.summon(u, false));

	await Promise.all(summonPromises);

	// Automatically start combat playback without waiting for ready button
	handleCombatStartExecution({ enemies });
}

export function showReadyButton(payload: { enemies: Unit[] }): Button {
	const readyButton = createUIButton({
		text: t("ui.ready"),
		position: vec2(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100),
		callback: () => {
			readyButton.container.destroy();
			// Start playback of pre-calculated combat results
			handleCombatStartExecution(payload);
		},
	});
	return readyButton;
}

export async function handleCombatStartExecution(_payload: { enemies: Unit[] }): Promise<void> {
	// Board input is already disabled - begin playback of pre-calculated combat
	await delay(COMBAT_START_DELAY_MS);

	const scene = getCurrentScene() as BattlegroundScene;
	scene.combatRunner = runCombatIO();
}
