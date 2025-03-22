import * as constants from "../constants";
import { signals, emit } from "../../../Models/Signals";
import * as StoreSystem from "../Store";
import { BattlegroundScene } from "../BattlegroundScene";
import { delay } from "../../../Utils/animation";

export let ui: Phaser.GameObjects.Container | null = null;
export let dropZone: Phaser.GameObjects.Zone | null = null;
export let dropZoneDisplay: Phaser.GameObjects.Graphics | null = null;

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

	[
		"Gold: " + force.gold,
		"HP: " + force.hp,
		"Wave: " + scene.state.gameData.wave,
	].forEach((text, i) => {
		const uiText = scene.add.text(10 + 200 * i, 10, text, constants.defaultTextConfig);
		ui?.add(uiText);
	});

	const sidebarWidth = 350;

	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.7);
	bg.fillRect(
		(scene.cameras.main.width - sidebarWidth)
		, 0, sidebarWidth, scene.cameras.main.height);

	ui?.add(bg);

	StoreSystem.updateStore(scene);

	const btn = createButton(
		"Start Battle",
		constants.SCREEN_WIDTH - 180, constants.SCREEN_HEIGHT - 60,
		() => {
			emit(signals.WAVE_START, scene.state.gameData.tick);
		});

	ui.add(btn);
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

	if (!zone.input) throw new Error("dropZone.input is null");


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