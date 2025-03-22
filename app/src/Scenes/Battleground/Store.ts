import { FORCE_ID_PLAYER } from "../../Models/Force";
import { asVec2, vec2 } from "../../Models/Geometry";
import * as Job from "../../Models/Job";
import { emit, signals } from "../../Models/Signals";
import { getUnitAt } from "../../Models/State";
import { BattlegroundScene } from "./BattlegroundScene";
import * as constants from "./constants";
import * as GridSystem from "./Systems/GridSystem";
import * as UIManager from "./Systems/UIManager";

const units: Job.JobId[] = [
	Job.SQUIRE,
	Job.ARCHER,
	Job.APPRENTICE,
	Job.ACOLYTE,
	Job.THIEF,
];

export function init(scene: BattlegroundScene) {

}

export function updateStore(scene: BattlegroundScene) {

	units.forEach(renderUnit(scene));
}

const renderUnit = (scene: BattlegroundScene) => (jobId: Job.JobId, i: number) => {

	const force = scene.playerForce;

	const job = Job.getJob(jobId);

	const row = Math.floor(i / 2);
	const col = i % 2;
	const x = (scene.cameras.main.width - 270) + col * constants.TILE_WIDTH * 1.1;
	const y = 150 + row * constants.TILE_HEIGHT * 1.4;

	const sprite = scene.add.image(
		x, y,
		job.id + "/portrait")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(constants.TILE_WIDTH * 0.8, constants.TILE_HEIGHT * 0.8)
		.setAlpha(force.gold >= constants.RECRUIT_UNIT_PRICE ? 1 : 0.5);

	UIManager.ui?.add(sprite);

	const name = scene.add.text(
		x, y + constants.HALF_TILE_HEIGHT * 1.4,
		job.name, constants.defaultTextConfig).setOrigin(0.5, 0.5);
	UIManager.ui?.add(name);

	sprite.setInteractive({ draggable: true });

	sprite.on('pointerdown', () => {
		if (force.gold > 0) return

		UIManager.displayError("Not enough gold");

	})

	if (force.gold < constants.RECRUIT_UNIT_PRICE) return;

	//sprite.on('dragstart', (pointer: Phaser.Input.Pointer) => {
	//  });

	sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		sprite.x = dragX;
		sprite.y = dragY;
	});

	sprite.on('drop', (pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Graphics) => {

		console.log("dropped on zone", zone.name);

		// if we have more zones in the future:
		//if (zone.name === "board") {

		const coords = GridSystem.getTileAt(pointer)!;

		const maybeOccupier = getUnitAt(scene.state)(coords);

		if (maybeOccupier) return;

		force.gold -= constants.RECRUIT_UNIT_PRICE;
		emit(signals.RECRUIT_UNIT, FORCE_ID_PLAYER, jobId, asVec2(coords));

		UIManager.updateUI();

	});

	sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {

		if (pointer.getDistance() < 10) {
			console.log("low pointer distance: click");
			handleClick(scene, job)(pointer);
		}
		// dragend happens after drop
		UIManager.updateUI();

	});
}

const handleClick = (
	scene: BattlegroundScene,
	job: Job.Job,
) => (pointer: Phaser.Input.Pointer) => {


}