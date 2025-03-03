import { FORCE_ID_PLAYER } from "../../Models/Force";
import { asVec2, vec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { emit, listeners, signals } from "../../Models/Signals";
import { makeUnit, Unit } from "../../Models/Unit";
import { BattlegroundScene } from "./BattlegroundScene";
import { RECRUIT_UNIT_PRICE, } from "./constants";

let units: Unit[] = [];

let container: Phaser.GameObjects.Container | null = null;

export function init(scene: BattlegroundScene) {

	units = [
		'soldier',
		'archer',
		'acolyte',
		'apprentice',
		'thief'
	].map(job => makeUnit(Math.random().toString(), FORCE_ID_PLAYER, job, asVec2({ x: 0, y: 0 })));

	listeners([
		[signals.BATTLE_START, async () => {
			container?.destroy(true);
		}]
	])
}

export function updateStore(scene: BattlegroundScene) {

	if (container) container.destroy(true);

	const width = scene.cameras.main.width;
	const height = 200;
	const x = 0;
	const y = 0;

	const force = scene.playerForce

	container = scene.add.container(x, y);

	// black rect
	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.8);
	bg.fillRect(0, 0, width, height);

	container.add(bg);

	units.forEach(renderUnit(scene));

}

const renderUnit = (scene: BattlegroundScene) => (unit: Unit, i: number) => {

	const force = scene.playerForce;

	const job = getJob(unit.job);

	const x = 100 + i * 120;
	const y = 100;

	const sprite = scene.add.image(
		x, y,
		job.id + "/portrait")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(96, 96)
		.setAlpha(force.gold >= RECRUIT_UNIT_PRICE ? 1 : 0.5);

	container?.add(sprite);

	const name = scene.add.text(x - 25, y + 60, job.name, { color: "white", align: "center" });
	container?.add(name);

	sprite.setInteractive({ draggable: true });

	sprite.on('pointerdown', () => {
		if (force.gold > 0) return

		scene.displayError("Not enough gold");

	})

	if (force.gold < RECRUIT_UNIT_PRICE) return;

	//sprite.on('dragstart', (pointer: Phaser.Input.Pointer) => {
	//  });

	sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		sprite.x = dragX;
		sprite.y = dragY;
	});

	sprite.on('drop', (pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Graphics) => {

		console.log("dropped on zone", zone.name);

		if (zone.name === "board") {

			if (scene.state.gameData.units.filter(u => u.force === FORCE_ID_PLAYER).length >= force.maxUnits) {
				scene.displayError("Max units reached");
				return;
			}

			const coords = scene.getTileAtWorldXY(vec2(pointer.worldX, pointer.worldY));
			console.log("dropped on tile", coords);

			force.gold -= RECRUIT_UNIT_PRICE;
			emit(signals.RECRUIT_UNIT, FORCE_ID_PLAYER, unit.job, asVec2(coords));

			scene.updateUI();
		}

	});

	sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {

		if (pointer.getDistance() < 10) {
			console.log("low pointer distance: click");
			handleClick(scene, unit)(pointer);
		}
		// dragend happens after drop
		scene.renderStore();

	});
}

const handleClick = (
	scene: BattlegroundScene,
	unit: Unit,
) => (pointer: Phaser.Input.Pointer) => {


}