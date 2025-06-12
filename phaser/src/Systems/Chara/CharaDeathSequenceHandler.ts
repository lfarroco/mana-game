// src/Systems/Chara/CharaDeathSequenceHandler.ts
import { Chara } from "./Chara";
import { GameEvents } from "../../constants/events";
import { tween, delay } from "../../Utils/animation";
import { getState } from "../../Models/State";
import * as constants from "../../constants/constants";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export const handleCharaDeath = async (scene: BattlegroundScene, data: { chara: Chara, killerId: string }): Promise<void> => {
	const { chara, killerId } = data;

	// Death Animations (moved from Chara.killUnit)
	tween({ targets: [chara], alpha: 0, duration: 1000 });

	const originalX = chara.x;
	// Ensure the chara is still valid and has a scene context for tweens
	if (chara.parent) {
		for (let i = 0; i < 5; i++) {
			await tween({ targets: [chara], x: originalX - 20, duration: 100, ease: "Cubic.Out" });
			await tween({ targets: [chara], x: originalX + 20, duration: 100, ease: "Cubic.Out" });
		}
		await delay(scene, 2000); // Use scene for delay context
	} else {
		// Fallback if chara scene is gone, skip animations/delay that depend on it
		console.warn("CharaDeathSequenceHandler: Chara scene context lost, skipping animations.");
	}


	// Post-animation/delay event emissions (moved from Chara.killUnit)
	const state = getState();
	scene.events.emit(GameEvents.UNIT_DIED_IN_BATTLE, { unit: chara.unit, killerId });
	scene.events.emit(GameEvents.TRAIT_EVAL_UNIT_DEATH, { unit: chara.unit });

	const killer = state.battleData.units.find(u => u.id === killerId);
	const isAlly = chara.unit.force === constants.FORCE_ID_PLAYER;
	const killEvent = isAlly ? GameEvents.TRAIT_EVAL_ALLIED_KILLED : GameEvents.TRAIT_EVAL_ENEMY_KILLED;
	scene.events.emit(killEvent, { unit: chara.unit, killer });

	if (killer) {
		scene.events.emit(GameEvents.TRAIT_EVAL_UNIT_KILL_BY_ME, { unit: killer, killedUnit: chara.unit });
	}

	// Note: The actual Chara.destroy() and removal from managers would typically be
	// handled by a system listening to GameEvents.UNIT_DIED_IN_BATTLE.
}
