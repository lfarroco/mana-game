import { FORCE_ID_CPU } from "../../Models/Force";
import * as Signals from "../../Models/Signals";
import { State } from "../../Models/State";
import { getChara } from "../../Scenes/Battleground/Systems/UnitManager";

let scene: Phaser.Scene;
let state: State;

const dropItemOnDestroy = (unitId: string) => {

	const chara = getChara(unitId);

	if (chara.unit.force !== FORCE_ID_CPU) return;

	// render item at location

	const item = scene.add.image(
		chara.container.x, chara.container.y,
		"items/toxic_potion").setScale(0.3)

	scene.tweens.add({
		targets: item,
		y: item.y - 100,
		duration: 500,
		ease: 'Power2',
		onComplete: () => {
			// accelerate towards lower right of the screen
			scene.tweens.add({
				targets: item,
				x: scene.cameras.main.width - 100,
				y: scene.cameras.main.height - 100,
				duration: 500,
				alpha: 0,
				ease: 'Power2',
				onComplete: () => {
					item.destroy();
					state.gameData.player.items.push("items/toxic_potion");
				}
			})

		}
	});

}

export const init = (sceneRef: Phaser.Scene, stateRef: any) => {
	state = stateRef;
	scene = sceneRef;
	Signals.listeners([
		[Signals.signals.UNIT_DESTROYED, dropItemOnDestroy]
	])
}