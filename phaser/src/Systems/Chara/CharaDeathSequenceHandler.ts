// src/Systems/Chara/CharaDeathSequenceHandler.ts
import { Chara } from "./Chara";
import { GameEvents } from "../../constants/events";
import { tween } from "../../Utils/animation";
import { getState } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export const handleCharaDeath = async (scene: BattlegroundScene, data: { chara: Chara, killerId: string }): Promise<void> => {
	const { chara, killerId } = data;

	// Death Animations
	const originalX = chara.x;
	// Ensure the chara is still valid and has a scene context for tweens

	tween({ targets: [chara], alpha: 0, duration: 500 })
	await tween({ targets: [chara], x: originalX - 10, duration: 100 });
	await tween({ targets: [chara], x: originalX + 10, duration: 100 });
	await tween({ targets: [chara], x: originalX - 6, duration: 100 });
	await tween({ targets: [chara], x: originalX + 6, duration: 100 });
	await tween({ targets: [chara], x: originalX, duration: 100 });

	// Post-animation/delay event emissions (moved from Chara.killUnit)
	const state = getState();
	scene.events.emit(GameEvents.UNIT_DIED_IN_BATTLE, { unit: chara.unit, killerId });
	scene.events.emit(GameEvents.TRAIT_EVAL_UNIT_DEATH, { unit: chara.unit });

	const killer = state.battleData.units.find(u => u.id === killerId);
	scene.events.emit(GameEvents.TRAIT_EVAL_ENEMY_KILLED, { unit: chara.unit, killer });

	state.battleData.units
		.filter(u => u.force === chara.unit.force && u.id !== chara.unit.id)
		.forEach(ally => {
			scene.events.emit(GameEvents.TRAIT_EVAL_ALLIED_KILLED, { unit: chara.unit, killer: ally });
		});

	if (killer) {
		scene.events.emit(GameEvents.TRAIT_EVAL_UNIT_KILL_BY_ME, { unit: killer, killedUnit: chara.unit });
	}

}
