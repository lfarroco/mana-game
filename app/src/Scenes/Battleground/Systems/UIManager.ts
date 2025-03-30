import * as constants from "../constants";
import { signals, emit } from "../../../Models/Signals";
import { BattlegroundScene } from "../BattlegroundScene";
import { delay } from "../../../Utils/animation";
import { getJob } from "../../../Models/Job";
import { getSkill } from "../../../Models/Skill";
import * as CharaSystem from "../../../Systems/Chara/Chara";
import * as bgConstants from "../constants";
import { COLOR_BLACK } from "../../../Utils/colors";

export let ui: Phaser.GameObjects.Container | null = null;
export let dropZone: Phaser.GameObjects.Zone | null = null;
export let dropZoneDisplay: Phaser.GameObjects.Graphics | null = null;
export let unitInfoContainer: Phaser.GameObjects.Container | null = null;

let scene: BattlegroundScene;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export function createButton(
	text: string,
	x: number,
	y: number,
	callback: () => void
) {
	const btnBg = scene.add.image(
		x, y,
		'ui/button'
	).setOrigin(0.5)
		.setDisplaySize(350, 100);
	const startBattleBtn = scene.add.text(
		x, y,
		text,
		{
			...constants.defaultTextConfig,
			color: '#000000',
			stroke: 'none',
			strokeThickness: 0,
		}).setOrigin(0.5);

	btnBg.setInteractive();

	btnBg.on("pointerup", callback);
	btnBg.on("pointerdown", () => {
		startBattleBtn.setShadow(0, 0, "#000000", 0, true, true);
	});
	btnBg.on("pointerover", () => {
		startBattleBtn.setColor('#ffffff');
		startBattleBtn.setShadow(2, 2, "#000000", 2, true, true);
	});
	btnBg.on("pointerout", () => {
		startBattleBtn.setColor('#000000');
		startBattleBtn.setShadow(0, 0, "#000000", 0, true, true);
	});

	const container = scene.add.container(0, 0);
	container.add([btnBg, startBattleBtn]);
	return container;
}

export function updateUI() {

	ui?.destroy(true);

	const force = scene.playerForce

	ui = scene.add.container(0, 0);



	const sidebarWidth = 350;

	const sidebarBg = scene.add.graphics();
	sidebarBg.fillStyle(COLOR_BLACK, 0.7);
	sidebarBg.fillRect(
		(scene.cameras.main.width - sidebarWidth)
		, 0, sidebarWidth, scene.cameras.main.height);

	ui?.add(sidebarBg);

	[
		"Gold: " + force.gold,
		"Income: " + force.income,
		"HP: " + force.hp,
		"Day: " + scene.state.gameData.day,
		"Hour: " + scene.state.gameData.hour,
	].forEach((text, i) => {
		const uiText = scene.add.text(constants.SCREEN_WIDTH - 200, 30 + i * 80, text, constants.defaultTextConfig);
		ui?.add(uiText);
	});

}

export function displayError(err: string) {

	scene.playFx('ui/error');

	const text = scene.add.text(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100, err, constants.defaultTextConfig);

	text.setOrigin(0.5)
	scene.tweens.add({
		targets: text,
		scaleX: 1.05,
		scaleY: 1.05,
		duration: 200,
		yoyo: true,
		repeat: 0,
		onComplete: async () => {
			await delay(scene, 1000);
			scene.tweens.add({
				targets: text,
				alpha: 0,
				duration: 500,
				onComplete: () => {
					text.destroy();
				}
			})
		}
	})
}

export function createDropZone(scene: BattlegroundScene) {
	const x = constants.TILE_WIDTH * 6;
	const y = constants.TILE_WIDTH * 2;
	const w = constants.TILE_WIDTH * 3;
	const h = constants.TILE_WIDTH * 3;
	const zone = scene.add.zone(x, y, w, h);
	zone.setOrigin(0);

	zone.setName("board");

	zone.setRectangleDropZone(w, h);

	dropZoneDisplay = scene.add.graphics();
	dropZoneDisplay.lineStyle(2, 0xffff00);
	dropZoneDisplay.fillStyle(0x00ffff, 0.3);
	dropZoneDisplay.fillRect(
		x, y,
		w, h
	);
	dropZoneDisplay.strokeRect(
		x, y,
		w, h
	);
	scene.tweens.add({
		targets: dropZoneDisplay,
		alpha: 0.1,
		duration: 2000,
		repeat: -1,
		yoyo: true
	});

	dropZone = zone;

	updateUI();
}

export function displayDropZone() {
	dropZoneDisplay?.setVisible(true);
}

export function hideDropZone() {
	dropZoneDisplay?.setVisible(false);
}

export function hideUI() {
	ui?.destroy(false);
}

// create a rect with the unit's portrait and stats
// to the right of the sprite
export function displayUnitInfo(chara: CharaSystem.Chara) {

	const { unit } = chara;

	const x = chara.container.x + constants.TILE_WIDTH + 10;
	const y = Math.min(chara.container.y - constants.TILE_HEIGHT, 200);
	const width = bgConstants.TILE_WIDTH * 3;
	const height = bgConstants.TILE_HEIGHT * 5;

	const job = getJob(unit.job);

	unitInfoContainer?.destroy();
	unitInfoContainer = scene.add.container(x, y);

	const bg = scene.add.graphics();
	bg.fillStyle(COLOR_BLACK, 0.7);
	bg.fillRoundedRect(0, 0, width, height, 10);

	unitInfoContainer.add([bg]);

	const pic = scene.add.image(0, 0, job.id + "/full")
		.setDisplaySize(bgConstants.TILE_WIDTH * 3, bgConstants.TILE_WIDTH * 3)
		.setOrigin(0);

	const jobName = scene.add.text(10, 10, job.name, bgConstants.defaultTextConfig);

	const stats = [
		`❤️ ${unit.hp}/${unit.maxHp}`,
		`⚔️ ${unit.attack}`,
		"🛡️ " + unit.defense,
		"🏃 " + unit.agility,
		"🎯 " + unit.crit,
	].map((text, i) => scene.add.text(
		250, (bgConstants.TILE_HEIGHT * 3) + 10 + i * 50,
		text, bgConstants.defaultTextConfig));
	unitInfoContainer.add(stats);

	const skills = unit.learnedSkills
		.map(getSkill)
		.map((sk, i) => scene.add.text(
			10, (bgConstants.TILE_HEIGHT * 3) + 80 + i * 50,
			sk.name, bgConstants.defaultTextConfig));

	unitInfoContainer.add([pic, jobName, ...skills]);

	const closeBtn = scene.add.text(
		width - 40, 10, "X", bgConstants.defaultTextConfig)
		.setInteractive()
		.on("pointerdown", () => {
			unitInfoContainer?.destroy();
		}
		);

	unitInfoContainer.add(closeBtn);

	ui?.add(unitInfoContainer);
}
