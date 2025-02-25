import Phaser from "phaser";
import { FORCE_ID_PLAYER } from "../../Models/Force";
import { asVec2, vec2 } from "../../Models/Geometry";
import { emit, signals } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";

export const updateBench = (scene: BattlegroundScene) => {
	if (scene.benchContainer) scene.benchContainer.destroy(true);

	const force = scene.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
	const width = scene.cameras.main.width;
	const height = 200;
	const x = 0;
	const y = scene.cameras.main.height - height;

	scene.benchContainer = scene.add.container(x, y);

	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.3);
	bg.fillRect(0, 0, width, height);

	scene.benchContainer.add(bg);

	// draw bench rect slots

	for (let i = 0; i < 5; i++) {
		const x = 50 + i * 100;
		const y = 50;
		const rect = scene.add.rectangle(x, y, 64, 64, 0x00ffff, 0.5);
		rect.setInteractive();
		if (rect.input)
			rect.input.dropZone = true;
		rect.setName("bench-slot-" + i);

		scene.benchContainer.add(rect);
	}

	scene.bench.forEach((unit, i) => {
		const x = 50 + i * 100;
		const y = 50;
		const sprite = scene.add.image(x, y, unit.job + "/portrait")
			.setOrigin(0.5, 0.5);
		scene.benchContainer?.add(sprite);
		sprite.setDisplaySize(64, 64);
		sprite.setInteractive({ draggable: true });
		sprite.on('pointerdown', () => {
			console.log("clicked", unit);
		});

		const name = scene.add.text(x - 25, y + 50, unit.name, { color: "white", align: "center" });
		scene.benchContainer?.add(name);

		const dragHandler = (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

			sprite.x = dragX;
			sprite.y = dragY;

		};
		const dragEndHandler = (pointer: Phaser.Input.Pointer) => {

			scene.renderBench();
			scene.renderStore();

			scene.dropZone?.destroy();
		};

		sprite.on('dragstart', () => {
			console.log("dragstart", unit, scene.benchContainer)
			scene.createDropZone()

			scene.benchContainer?.bringToTop(sprite);
		});

		sprite.on('drop', (pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Graphics) => {

			if (zone.name === "board") {
				const coords = scene.getTileAtWorldXY(vec2(pointer.worldX, pointer.worldY));
				console.log("dropped on tile from bench", coords);

				force.gold -= 1;
				scene.bench = scene.bench.filter((u) => u.id !== unit.id);

				emit(signals.RECRUIT_UNIT, FORCE_ID_PLAYER, unit.job, asVec2(coords));
			}

		});


		sprite.on('drag', dragHandler);
		sprite.on('dragend', dragEndHandler);

	});
}
