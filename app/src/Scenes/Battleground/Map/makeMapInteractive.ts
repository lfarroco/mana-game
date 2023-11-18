import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";

export function makeMapInteractive(
	scene: BattlegroundScene,
	map: Phaser.Tilemaps.Tilemap,
	bgLayer: Phaser.Tilemaps.TilemapLayer
) {
	//set camera bounds to the world
	scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

	bgLayer?.setInteractive({ draggable: true });

	let startVector = { x: 0, y: 0 };

	bgLayer.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		startVector = { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };

	});

	bgLayer.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		scene.cameras.main.scrollX = startVector.x - dragX;
		scene.cameras.main.scrollY = startVector.y - dragY;

	});

	bgLayer.on("pointerup", (pointer: Phaser.Input.Pointer, x: number, y: number) => {

		const tile = bgLayer.getTileAtWorldXY(x, y);
		if (!tile) return
		tile.alpha = 0.5;

		if (!scene.selectedEntity) return

		const sourceTile = bgLayer.getTileAtWorldXY(scene.selectedEntity.x, scene.selectedEntity.y);
		scene.drawLine(
			sourceTile,
			tile
		)
	});
}
