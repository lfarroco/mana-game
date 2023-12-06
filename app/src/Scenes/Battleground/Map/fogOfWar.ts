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

function refreshFogOfWar(scene: BattlegroundScene, fogOfWarShape: Phaser.GameObjects.Graphics) {
	fogOfWarShape.clear()
	scene.charas.filter(c => c.force === FORCE_ID_PLAYER).forEach(c => {
		fogOfWarShape?.fillCircle(c.body.x, c.body.y, 200)
	})

	//player-controlled cities
	scene.cities.forEach(c => {
		fogOfWarShape?.fillCircle(c.x, c.y, 200)
	})

	const allied = scene.charas.filter(c => c.force === FORCE_ID_PLAYER)

	const enemies = scene.charas.filter(c => c.force === FORCE_ID_CPU)

	enemies.forEach(enemy => {
		const distances = allied
			.map((ally) => {
				return Phaser.Math.Distance.BetweenPoints(ally.body, enemy.body)
			})
			.sort((a, b) => a - b)

		const closestCity = scene.cities.map(city => {
			return Phaser.Math.Distance.BetweenPoints(city, enemy.body)
		}).sort((a, b) => a - b)[0]

		const [closest] = distances

		if (closest < 250 || closestCity < 250) {
			enemy.spine.active = true;
			enemy.spine.alpha = 1

			//phaser-spine doesn't support alpha yet
			//const diff = closest - 100
			//chara.spine.alpha = 1 - (diff / 150)
		} else {
			enemy.spine.active = false;
			enemy.spine.alpha = 0
		}
	})
}