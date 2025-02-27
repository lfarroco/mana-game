import { FORCE_ID_PLAYER } from "../../Models/Force";
import { asVec2, vec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { emit, signals } from "../../Models/Signals";
import { makeUnit, Unit } from "../../Models/Unit";
import { BattlegroundScene } from "./BattlegroundScene";

export function updateStore(scene: BattlegroundScene) {

	if (scene.storeContainer) scene.storeContainer.destroy(true);

	const width = scene.cameras.main.width;
	const height = 200;
	const x = 0;
	const y = 0;

	const force = scene.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
	const gold = force.gold;

	scene.storeContainer = scene.add.container(x, y);

	// black rect
	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.8);
	bg.fillRect(0, 0, width, height);

	scene.storeContainer.add(bg);

	const refreshIcon = scene.add.text(width - 50, height - 50, "🔄")
		.setOrigin(0.5, 0.5)
		.setScale(2)
		.setInteractive()
		.setAlpha(gold > 2 ? 1 : 0.5)
		.on('pointerdown', () => {
			if (gold < 2) return;
			force.gold -= 2;
			scene.populateStore();
			scene.renderStore();
		});

	scene.storeContainer.add(refreshIcon);

	scene.store.forEach(renderUnit(scene));

	const goldText = scene.add.text(width - 100, 50, `Gold: ${gold}`, { color: "white" });

	scene.storeContainer.add(goldText);
}

const renderUnit = (scene: BattlegroundScene) => (unit: Unit, i: number) => {

	const force = scene.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

	const job = getJob(unit.job);

	const x = 150 + i * 200;
	const y = 100;

	const sprite = scene.add.image(
		x, y,
		job.id + "/portrait")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(96, 96)
		.setAlpha(force.gold >= 1 ? 1 : 0.5);

	scene.storeContainer?.add(sprite);

	const name = scene.add.text(x - 25, y + 60, job.name, { color: "white", align: "center" });
	scene.storeContainer?.add(name);

	sprite.setInteractive({ draggable: true });

	if (force.gold < 1 || scene.bench.length >= 5) return;

	sprite.on('dragstart', (pointer: Phaser.Input.Pointer) => {

		if (!scene.storeContainer) throw new Error("store container not found");


		scene.children.bringToTop(scene.storeContainer);

	});

	sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
		sprite.x = dragX;
		sprite.y = dragY;
	});

	sprite.on('drop', (pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Graphics) => {

		console.log("dropped on zone", zone.name);
		if (zone.name.startsWith("bench-slot")) {

			force.gold -= 1;

			scene.store = scene.store.filter((u) => u.id !== unit.id);
			scene.bench.push(unit);

		}

		if (zone.name === "board") {
			const coords = scene.getTileAtWorldXY(vec2(pointer.worldX, pointer.worldY));
			console.log("dropped on tile", coords);

			force.gold -= 1;
			scene.store = scene.store.filter((u) => u.id !== unit.id);

			emit(signals.RECRUIT_UNIT, FORCE_ID_PLAYER, unit.job, asVec2(coords));
		}

	});

	sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {
		console.log("dragend");

		if (pointer.getDistance() < 10) {
			console.log("low pointer distance: click");
			handleClick(scene, unit)(pointer);
		}
		// dragend happens after drop
		scene.renderStore();
		scene.renderBench();

	});
}

const handleClick = (
	scene: BattlegroundScene,
	unit: Unit,
) => (pointer: Phaser.Input.Pointer) => {

	const force = scene.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

	console.log("click on store unit", unit);

	force.gold -= 1;

	const job = getJob(unit.job);

	scene.store = scene.store.filter((u) => u.id !== unit.id);
	scene.bench.push(
		makeUnit(
			Math.random().toString(),
			FORCE_ID_PLAYER,
			job.id,
			asVec2({ x: 0, y: 0 })
		));
}