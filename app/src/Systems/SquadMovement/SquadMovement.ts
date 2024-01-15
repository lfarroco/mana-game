import { Vec2 } from "../../Models/Geometry";
import { listeners, events, emit } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import moveSquads from "../../Scenes/Battleground/Map/ProcessTick";

// we have a standalone system, that contains its own logic and state
// - system
// - ui
// - phaser scene
// this structure allows us to keep the system logic separate from the phaser scene and the ui
// using events we can send and receive data between the system and the phaser scene and the ui

export function init(scene: BattlegroundScene) {

	let squadMovementIndex: { [id: string]: number } = {}

	listeners([
		[events.BATTLEGROUND_TICK, () => moveSquads(scene)],
		[events.DISPATCH_SQUAD, (squadId: string, _cityId: string) => {
			squadMovementIndex[squadId] = 0;
		}],
		[events.SQUAD_WALKS_TOWARDS_CELL, (squadId: string, vec: Vec2) => {
			squadMovementIndex[squadId]++;
		}],
		[events.SQUAD_MOVED_INTO_CELL, (squadId: string, vec: Vec2) => {
			squadMovementIndex[squadId] = 0;
		}
		]
	])

}