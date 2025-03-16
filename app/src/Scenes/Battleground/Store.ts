import { FORCE_ID_PLAYER } from "../../Models/Force";
import { asVec2, vec2 } from "../../Models/Geometry";
import * as Job from "../../Models/Job";
import { emit, listeners, signals } from "../../Models/Signals";
import { makeUnit, Unit } from "../../Models/Unit";
import { BattlegroundScene } from "./BattlegroundScene";
import { defaultTextConfig, RECRUIT_UNIT_PRICE, } from "./constants";

const units: Job.JobId[] = [
	Job.SOLDIER,
	Job.ARCHER,
	Job.APPRENTICE,
	Job.ACOLYTE,
	Job.THIEF,
];

let container: Phaser.GameObjects.Container | null = null;

export function init(scene: BattlegroundScene) {

	listeners([
		[signals.WAVE_START, async () => {
			container?.destroy(true);
		}]
	])
}

export function updateStore(scene: BattlegroundScene) {

	if (container) container.destroy(true);

	const width = 300
	const height = 150;
	const x = scene.cameras.main.width - width;
	const y = 0;

	container = scene.add.container(x, y);

	units.forEach(renderUnit(scene));

}

const renderUnit = (scene: BattlegroundScene) => (jobId: Job.JobId, i: number) => {

	const force = scene.playerForce;

	const job = Job.getJob(jobId);

	const row = Math.floor(i / 2);
	const col = i % 2;
	const x = 100 + col * 100;
	const y = 150 + row * 140;

	const sprite = scene.add.image(
		x, y,
		job.id + "/portrait")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(96, 96)
		.setAlpha(force.gold >= RECRUIT_UNIT_PRICE ? 1 : 0.5);

	container?.add(sprite);

	const name = scene.add.text(x, y + 60, job.name, defaultTextConfig).setOrigin(0.5, 0.5);
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

			const coords = scene.getTileAt(vec2(pointer.worldX, pointer.worldY));

			force.gold -= RECRUIT_UNIT_PRICE;
			emit(signals.RECRUIT_UNIT, FORCE_ID_PLAYER, jobId, asVec2(coords));

			scene.updateUI();
		}

	});

	sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {

		if (pointer.getDistance() < 10) {
			console.log("low pointer distance: click");
			handleClick(scene, job)(pointer);
		}
		// dragend happens after drop
		scene.updateUI();

	});
}

const handleClick = (
	scene: BattlegroundScene,
	job: Job.Job,
) => (pointer: Phaser.Input.Pointer) => {


}