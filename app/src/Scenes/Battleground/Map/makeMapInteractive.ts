import Phaser from "phaser";

export function makeMapInteractive(
	scene: Phaser.Scene,
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
	});
}
