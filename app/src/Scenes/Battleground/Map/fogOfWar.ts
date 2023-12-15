import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../Models/Force";
import { TILE_WIDTH } from "../constants";


export function createFogOfWar(scene: BattlegroundScene) {
	// const fogOfWar = scene.add.graphics();
	// if (!scene.layers?.background) throw new Error("background layer not found");
	// fogOfWar
	// 	.fillStyle(0, 0.9)
	// 	.fillRect(0, 0, scene.layers.background.width, scene.layers.background.height);
	// const fogOfWarShape = scene.make.graphics();
	// const mask = new Phaser.Display.Masks.BitmapMask(scene, fogOfWarShape);
	// mask.invertAlpha = true;
	// fogOfWar.setMask(mask);

	scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
		refreshFogOfWar(scene)
	})

}

function refreshFogOfWar(scene: BattlegroundScene) {

	const fow = scene.tilemap?.getLayer("map_fow")

	if (!fow) return

	fow.data.forEach(row => {
		row.forEach(tile => {
			tile.tint = 0x000000
			tile.alpha = 0.5
		})
	});


	scene.charas
		.filter(c => c.force === FORCE_ID_PLAYER)
		.forEach(c => {
			// clear alpha around chara

			const [x, y] = [Math.floor(c.body.x / TILE_WIDTH), Math.floor(c.body.y / TILE_WIDTH)]
			const VIEW_RADIUS = 4

			for (let i = -(VIEW_RADIUS); i <= VIEW_RADIUS; i++) {
				for (let j = - (VIEW_RADIUS); j <= VIEW_RADIUS; j++) {

					//manhattan distance
					const dist = Math.abs(i) + Math.abs(j)

					if (dist > VIEW_RADIUS) continue

					const tile = fow.data[y + j]?.[x + i]
					if (tile) tile.alpha = 0

				}
			}
		})

	// //player-controlled cities
	// scene.cities.forEach(c => {
	// 	fogOfWarShape?.fillCircle(c.x, c.y, 200)
	// })

	// const allied = scene.charas.filter(c => c.force === FORCE_ID_PLAYER)

	// const enemies = scene.charas.filter(c => c.force === FORCE_ID_CPU)

	// enemies.forEach(enemy => {
	// 	const distances = allied
	// 		.map((ally) => {
	// 			return Phaser.Math.Distance.BetweenPoints(ally.body, enemy.body)
	// 		})
	// 		.sort((a, b) => a - b)

	// 	const closestCity = scene.cities.map(city => {
	// 		return Phaser.Math.Distance.BetweenPoints(city, enemy.body)
	// 	}).sort((a, b) => a - b)[0]

	// 	const [closest] = distances

	// 	if (closest < 250 || closestCity < 250) {
	// 		enemy.spine.active = true;
	// 		enemy.spine.alpha = 1

	// 		//phaser-spine doesn't support alpha yet
	// 		//const diff = closest - 100
	// 		//chara.spine.alpha = 1 - (diff / 150)
	// 	} else {
	// 		enemy.spine.active = false;
	// 		enemy.spine.alpha = 0
	// 	}
	// })
}