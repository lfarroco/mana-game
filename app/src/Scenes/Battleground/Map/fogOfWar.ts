import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../Models/Force";



export function createFogOfWar(scene: BattlegroundScene) {
	const fogOfWar = scene.add.graphics();
	if (!scene.layers?.background) throw new Error("background layer not found");
	fogOfWar
		.fillStyle(0, 0.4)
		.fillRect(0, 0, scene.layers.background.width, scene.layers.background.height);
	const fogOfWarShape = scene.make.graphics();
	const mask = new Phaser.Display.Masks.BitmapMask(scene, fogOfWarShape);
	mask.invertAlpha = true;
	fogOfWar.setMask(mask);

	scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
		refreshFogOfWar(scene, fogOfWarShape)
	})
}

function refreshFogOfWar(scene: BattlegroundScene, fogOfWarShape: Phaser.GameObjects.Graphics ) {
	fogOfWarShape.clear()
	scene.charas.filter(c => c.force === FORCE_ID_PLAYER).forEach(c => {
		fogOfWarShape?.fillCircle(c.body.x, c.body.y, 200)
	})

	const allied = scene.charas.filter(c => c.force === FORCE_ID_PLAYER)

	const enemies = scene.charas.filter(c => c.force === FORCE_ID_CPU)

	enemies.forEach(chara => {
		const distances = scene.charas
			.filter(c => c.force === FORCE_ID_PLAYER)
			.flatMap((c) => {

				return allied.map(a => {
					return Phaser.Math.Distance.Between(a.body.x, a.body.y, chara.body.x, chara.body.y)
				})

			})
			.sort((a, b) => a - b)

		const [closest] = distances

		if (closest < 250) {
			chara.spine.active = true;
			chara.spine.alpha = 1

			//phaser-spine doesn't support alpha yet
			//const diff = closest - 100
			//chara.spine.alpha = 1 - (diff / 150)
		} else {
			chara.spine.active = false;
			chara.spine.alpha = 0
		}
	})
}