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

		if (pointer.upElement?.tagName !== "CANVAS") return;

		startVector = { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };

	});

	bgLayer.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		scene.cameras.main.scrollX = startVector.x - dragX;
		scene.cameras.main.scrollY = startVector.y - dragY;

	});

	bgLayer.on("pointerup", (pointer: Phaser.Input.Pointer, x: number, y: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		const tile = bgLayer.getTileAtWorldXY(x, y);

		if (!tile) return;

		if (scene.state.selectedEntity?.type === "squad") {

			const sqd = scene.state.squads.find(squad => squad.id === scene.state.selectedEntity?.id)
			if (!sqd) return

			console.log("moving squad", sqd.id, "to", tile.x, tile.y)
			scene.moveTo(sqd, tile)
		}
	});
}
