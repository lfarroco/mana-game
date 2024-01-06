import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getState } from "../../../Models/State";
import { events, emit } from "../../../Models/Signals";
import { asBoardVec, isSameBoardVec, windowVec } from "../../../Models/Misc";
import { Chara } from "../../../Components/chara";

export function makeSquadsInteractive(
	scene: BattlegroundScene,
	entities: Chara[]
) {

	entities.forEach(entity => {

		makeSquadInteractive(entity, scene);
	});
}
export function makeSquadInteractive(chara: Chara, scene: BattlegroundScene) {

	chara.sprite.setInteractive();
	chara.sprite.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {

		const state = getState();

		if (pointer.upElement.tagName !== "CANVAS") return;

		if (!chara.sprite.active) return;

		if (state.selectedEntity?.type === "squad" &&
			(scene.isSelectingSquadMove || pointer.rightButtonReleased())
		) {
			const tile = scene.layers?.background.getTileAtWorldXY(chara.sprite.x, chara.sprite.y);
			if (!tile) return
			emit(
				events.SELECT_SQUAD_MOVE_DONE,
				state.selectedEntity.id,
				asBoardVec(tile)
			);
		} else {

			// check if another squad is in the same cell

			const squad = state.squads.find(squad => squad.id === chara.id);

			if (!squad) throw new Error(`Squad ${chara.id} not found`)

			const squads = state.squads
				.filter(s => s.force === squad.force)
				.filter(s => isSameBoardVec(s.position, squad.position));

			if (squads.length > 1) {

				emit(
					events.MULTIPLE_SQUADS_SELECTED,
					squads.map(s => s.id)
				);

			} else
				emit(
					events.SQUAD_SELECTED,
					chara.id
				);
		}
	});
}

