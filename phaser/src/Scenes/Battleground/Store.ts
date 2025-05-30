import { updatePlayerGoldIO } from "../../Models/Force";
import * as Job from "../../Models/Card";
import { addUnitToGuild, getBattleUnitAt } from "../../Models/State";
import { BattlegroundScene } from "./BattlegroundScene";
import * as constants from "./constants";
import * as GridSystem from "./Systems/GridSystem";
import * as UIManager from "./Systems/UIManager";

const units: Job.CardId[] = [
	Job.KNIGHT,
	Job.ARCHER,
	Job.APPRENTICE,
	Job.CLERIC,
	Job.THIEF,
];

export function init(_scene: BattlegroundScene) {

}

export function updateStore(scene: BattlegroundScene) {

	units.forEach(renderUnit(scene));
}

const renderUnit = (scene: BattlegroundScene) => (jobId: Job.CardId, i: number) => {

	const { player } = scene.state.gameData;

	const job = Job.getCard(jobId);

	const row = Math.floor(i / 2);
	const col = i % 2;
	const x = (scene.cameras.main.width - 270) + col * constants.TILE_WIDTH * 1.1;
	const y = 150 + row * constants.TILE_HEIGHT * 1.4;

	const sprite = scene.add.image(
		x, y,
		job.pic)
		.setOrigin(0.5, 0.5)
		.setDisplaySize(constants.TILE_WIDTH * 0.8, constants.TILE_HEIGHT * 0.8)
		.setAlpha(player.gold >= constants.RECRUIT_UNIT_PRICE ? 1 : 0.5);

	UIManager.ui?.add(sprite);

	const name = scene.add.text(
		x, y + constants.HALF_TILE_HEIGHT * 1.4,
		job.name, constants.defaultTextConfig).setOrigin(0.5, 0.5);
	UIManager.ui?.add(name);

	sprite.setInteractive({ draggable: true });

	sprite.on('pointerdown', () => {
		if (player.gold > 0) return

		UIManager.displayError("Not enough gold")

	})

	if (player.gold < constants.RECRUIT_UNIT_PRICE) return;

	//sprite.on('dragstart', (pointer: Phaser.Input.Pointer) => {
	//  });

	sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		sprite.x = dragX;
		sprite.y = dragY;
	});

	sprite.on('drop', (pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Graphics) => {

		console.log("dropped on zone", zone.name);

		// if we have more zones in the future:
		//if (zone.name === "board") {

		const coords = GridSystem.getTileAt(pointer)!;

		const maybeOccupier = getBattleUnitAt(scene.state)(coords);

		if (maybeOccupier) return;

		updatePlayerGoldIO(-constants.RECRUIT_UNIT_PRICE);
		addUnitToGuild(player.id, jobId)

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
	_scene: BattlegroundScene,
	_job: Job.Card,
) => (_pointer: Phaser.Input.Pointer) => {


}