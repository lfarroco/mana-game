import { FORCE_ID_PLAYER } from "../../Models/Force";
import { asVec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { makeUnit, Unit } from "../../Models/Unit";
import { BattlegroundScene } from "./BattlegroundScene";

export function updateStore(scene: BattlegroundScene) {

	if (scene.storeContainer) scene.storeContainer.destroy(true);

	const width = scene.cameras.main.width;
	const height = 300;
	const x = 0;
	const y = 0;

	scene.storeContainer = scene.add.container(x, y);

	// black rect
	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.8);
	bg.fillRect(0, 0, width, height);

	scene.storeContainer.add(bg);

	const refreshIcon = scene.add.image(width - 50, height - 50, "refresh")
		.setOrigin(0.5, 0.5)
		.setInteractive()
		.on('pointerdown', () => {
			scene.populateStore();
			scene.renderStore();
		});

	scene.storeContainer.add(refreshIcon);

	scene.store.forEach(renderUnit(scene));
}

const renderUnit = (scene: BattlegroundScene) => (unit: Unit, i: number) => {

	const job = getJob(unit.job);

	const x = 50 + i * 100;
	const y = 150;

	const sprite = scene.add.image(
		x, y,
		job.id + "/portrait")
		.setOrigin(0.5, 0.5);

	scene.storeContainer?.add(sprite);

	sprite.setDisplaySize(64, 64);
	sprite.setInteractive();
	sprite.on('pointerdown', handleClick(scene, unit));

	const name = scene.add.text(x - 25, y + 50, job.name, { color: "white", align: "center" });

	scene.storeContainer?.add(name);
}

const handleClick = (scene: BattlegroundScene, unit: Unit) => () => {

	const job = getJob(unit.job);

	scene.store = scene.store.filter((u) => u.id !== unit.id);
	scene.bench.push(
		makeUnit(
			Math.random().toString(),
			FORCE_ID_PLAYER,
			job.id,
			asVec2({ x: 0, y: 0 })
		));
	scene.renderBench();
	scene.renderStore();
}