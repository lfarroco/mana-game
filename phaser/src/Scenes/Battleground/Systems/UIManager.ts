import * as constants from "../constants";
import { BattlegroundScene } from "../BattlegroundScene";
import { delay } from "../../../Utils/animation";
import { getJob } from "../../../Models/Job";
import * as CharaSystem from "../../../Systems/Chara/Chara";
import * as bgConstants from "../constants";
import { COLOR_BLACK } from "../../../Utils/colors";
import { State } from "../../../Models/State";
import { getTrait } from "../../../Models/Traits"
import * as Tooltip from "../../../Systems/Tooltip";
import { overlap } from "./UnitManager";

export let ui: Phaser.GameObjects.Container | null = null;
export let dropZone: Phaser.GameObjects.Zone | null = null;
export let dropZoneDisplay: Phaser.GameObjects.Graphics | null = null;
export let unitInfoContainer: Phaser.GameObjects.Container | null = null;

let chestContainer: Phaser.GameObjects.Container;
const chestWidth = constants.SCREEN_WIDTH / 2 - 100;

let scene: BattlegroundScene;
let state: State;

let isChestOpen = false;

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

	const chest = scene.add.image(
		constants.SCREEN_WIDTH - 140,
		constants.SCREEN_HEIGHT - 100,
		"ui/chest"
	).setOrigin(0.5).setDisplaySize(250, 250);

	chest.setInteractive();

	chestContainer = scene.add.container(0, 0);

	chest.on("pointerup", () => {

		if (isChestOpen) {
			isChestOpen = false;
			scene.add.tween({
				targets: chestContainer,
				x: -chestWidth,
				duration: 500,
				ease: "Power2",
				onComplete: () => {
					chestContainer.removeAll(true);
				}
			});
		} else {
			isChestOpen = true;
			scene.children.bringToTop(chestContainer);
			chestContainer.setX(-chestWidth);

			updateChest();

			scene.add.tween({
				targets: chestContainer,
				x: 0,
				duration: 500,
				ease: "Power2",
			});
		}

	});

}

export function updateChest() {

	chestContainer.removeAll(true);

	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.8);
	bg.fillRect(0, 0, chestWidth, constants.SCREEN_HEIGHT);

	bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, chestWidth, constants.SCREEN_HEIGHT), Phaser.Geom.Rectangle.Contains);

	chestContainer.add(bg);

	state.gameData.player.items.forEach((id, i) => {
		const baseX = 100;
		const baseY = 100;

		const icon = scene.add.image(0, 0, id)
			.setDisplaySize(constants.TILE_WIDTH, constants.TILE_WIDTH)
			.setOrigin(0);

		// 3x3 grid
		const x = i % 3;
		const y = Math.floor(i / 3);

		const position = [
			baseX + (x * constants.TILE_WIDTH),
			baseY + (y * constants.TILE_WIDTH)
		]
		icon.setPosition(...position);
		chestContainer.add(icon);

		icon.setInteractive({ draggable: true });
		icon.on("pointerover", () => {
			Tooltip.render(
				icon.x + 400, icon.y + 100,
				"Item: " + id);
		});
		icon.on("pointerout", () => {
			Tooltip.hide();
		});
		icon.on("dragstart", () => {
			Tooltip.hide();
		});
		icon.on("drag", (pointer: Phaser.Input.Pointer) => {
			icon.x = pointer.x - constants.TILE_WIDTH / 2;
			icon.y = pointer.y - constants.TILE_WIDTH / 2;
		});

		icon.on("dragend", (pointer: Phaser.Input.Pointer) => {
			const target = overlap(pointer);
			if (!target) {
				icon.setPosition(...position)
				return;
			};
			console.log("target", target);
			icon.destroy();
			target.unit.equip = id;
			target.equipDisplay.setTexture(id);
			target.equipDisplay.alpha = 1;
			target.equipDisplay.setDisplaySize(60, 60);
			state.gameData.player.items = state.gameData.player.items.filter(item => item !== id);
		});

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

	const pic = scene.add.image(0, 0, "charas/" + job.id)
		.setDisplaySize(bgConstants.TILE_WIDTH * 3, bgConstants.TILE_WIDTH * 3)
		.setOrigin(0);
	unitInfoContainer.add(pic);

	const jobName = scene.add.text(10, 10, job.name, bgConstants.defaultTextConfig);
	unitInfoContainer.add(jobName);

	const traitsList = unit.traits.map((traitId, idx) => {
		const iconSize = 96;
		const trait = getTrait(traitId);
		const icon = scene.add.image(10, 450 + idx * (iconSize + 5), trait.id).setDisplaySize(iconSize, iconSize);
		icon.setOrigin(0);
		//text.setColor(trait.color);
		return icon
	});
	unitInfoContainer.add(traitsList);


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
