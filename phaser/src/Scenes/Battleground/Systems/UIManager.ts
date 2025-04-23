import Phaser from "phaser";
import * as constants from "../constants";
import { BattlegroundScene } from "../BattlegroundScene";
import { delay, tween } from "../../../Utils/animation";
import { COLOR_BLACK } from "../../../Utils/colors";
import { getState, State } from "../../../Models/State";
import * as Chest from "./Chest";

export let ui: Phaser.GameObjects.Container | null = null;
export let dropZone: Phaser.GameObjects.Zone | null = null;
export let dropZoneDisplay: Phaser.GameObjects.Graphics | null = null;
export let unitInfoContainer: Phaser.GameObjects.Container | null = null;

export let scene: BattlegroundScene;
export let state: State;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
	state = scene.state;
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
	)
		.setOrigin(0.5)
		.setDisplaySize(350, 100);

	const buttonText = scene.add.text(
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
		buttonText.setShadow(0, 0, "#000000", 0, true, true);
	});
	btnBg.on("pointerover", () => {
		buttonText.setColor('#ffffff');
		buttonText.setShadow(2, 2, "#000000", 2, true, true);
	});
	btnBg.on("pointerout", () => {
		buttonText.setColor('#000000');
		buttonText.setShadow(0, 0, "#000000", 0, true, true);
	});

	const container = scene.add.container(0, 0);
	container.add([btnBg, buttonText]);
	return container;
}

export function updateUI() {

	ui?.destroy(true);

	const force = state.gameData.player;

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

	Chest.renderChestButton();

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
	const y = constants.TILE_HEIGHT * 1;
	const w = constants.TILE_WIDTH * 3;
	const h = constants.TILE_HEIGHT * 3;
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

export async function goldChangeAnimation(
	gold: number,
) {

	const state = getState();

	const sign = gold > 0 ? "+" : "";

	const text = `${sign}${gold}`;

	const goldAmount = scene.add.text(...Chest.position, text, constants.titleTextConfig)
		.setOrigin(0.5, 0.5)
		.setAlpha(0)
		.setScale(1);

	await tween({
		targets: [goldAmount],
		alpha: 1,
		scale: 1.5,
		y: goldAmount.y + (-50 * Math.sign(gold)),
		duration: 500 / state.options.speed,
	});

	await tween({
		targets: [goldAmount],
		alpha: 0,
		scale: 1,
		y: goldAmount.y + (-50 * Math.sign(gold)),
		duration: 1000 / state.options.speed,
		onComplete: () => {
			goldAmount.destroy();
		}
	});

}

export async function coinDropIO(
	gold: number,
	coins: number,
	x: number, y: number,
) {

	const state = getState();

	const chestPosition: [number, number] = [
		scene.cameras.main.width - 150,
		scene.cameras.main.height - 100
	];

	const [chestX, chestY] = chestPosition;

	goldChangeAnimation(gold);

	for (let i = 0; i < coins; i++) {
		const coin = scene.add.image(0, 0, 'coin').setOrigin(0.5, 0.5)
			.setPosition(x + Math.random() * 200, y + Math.random() * 150)
			.setAlpha(0)
			//random rotation
			.setRotation(Math.random() * Math.PI * 2);

		scene.add.tween({
			targets: coin,
			alpha: 1,
			duration: (500 / state.options.speed) * Math.max(Math.random(), 0.5),
		});

		scene.add.tween({
			targets: coin,
			scaleY: 0.5,
			duration: 100 / state.options.speed,
			yoyo: true,
			repeat: -1
		});

		scene.add.tween({
			targets: coin,
			y: coin.y - 150,
			ease: "Quad.Out",
			duration: 300 / state.options.speed,
			onComplete: () => {
				const distance = Phaser.Math.Distance.Between(coin.x, coin.y, chestX, chestY);
				scene.add.tween({
					targets: coin,
					x: chestX,
					y: chestY,
					alpha: 0.5,
					duration: distance / 3,
					ease: "Quad.In",
					onComplete: () => {
						coin.destroy();
					}
				});
			}
		});
	}

	// when coins hit target, emit coins around
	await delay(scene, 1000 / state.options.speed);

	scene.add.particles(...chestPosition, 'coin', {
		speed: { min: 100, max: 200, },
		lifespan: 500,
		alpha: { start: 1.4, end: 0 },
		angle: { min: 0, max: 360 },
		quantity: coins * 2,
		frequency: 100,
		maxParticles: coins * 2,
		rotate: {
			min: 0,
			max: 360
		},
		scaleY: {
			start: -1,
			end: 1
		}

	});
}

