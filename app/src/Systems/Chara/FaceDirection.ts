import { Chara } from "../../Components/MapChara";
import { Direction, getDirection } from "../../Models/Direction";
import { Vec2 } from "../../Models/Geometry";
import { events, listeners, } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {

	listeners([
		[events.SQUAD_WALKS_TOWARDS_CELL, (squadId: string, next: Vec2, walked: number, _total: number) => {

			if (walked > 0) return;

			const squad = scene.state.squads.find(s => s.id === squadId)
			if (!squad) throw new Error(`Squad with id ${squadId} not found`)

			const chara = scene.charas.find(c => c.id === squadId);
			if (!chara) throw new Error("chara not found");

			const direction = getDirection(squad.position, next);

			faceDirection(direction, chara)

		}],
		[events.SQUAD_FINISHED_MOVE_ANIM, (squadId: string) => {

			const squad = scene.state.squads.find(s => s.id === squadId)
			if (!squad) throw new Error(`Squad with id ${squadId} not found`)

			const chara = scene.charas.find(c => c.id === squadId);
			if (!chara) throw new Error(`Chara with id ${squadId} not found`)

			const next = squad.path[0];

			if (next && squad.path.length > 1) {

				const nextDirection = getDirection(squad.position, next);

				faceDirection(nextDirection, chara)

			}
		}],
		[events.ATTACK, (squadId: string, targetId: string) => {

			const squad = scene.state.squads.find(s => s.id === squadId)
			if (!squad) throw new Error(`Squad with id ${squadId} not found`)

			const chara = scene.charas.find(c => c.id === squadId);
			if (!chara) throw new Error(`Chara with id ${squadId} not found`)

			const target = scene.state.squads.find(c => c.id === targetId);
			if (!target) throw new Error(`Chara with id ${targetId} not found`)

			const direction = getDirection(squad.position, target.position);

			faceDirection(direction, chara)

		}]
	])

}

// TODO: split facing from the arrow emote
function faceDirection(direction: Direction, chara: Chara) {

	chara.sprite.play(chara.job + "-walk-" + direction, true);
}