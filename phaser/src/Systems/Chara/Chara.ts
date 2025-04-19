import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { asVec2, eqVec2, vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER, playerForce } from "../../Models/Force";
import { getJob, Job } from "../../Models/Job";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import * as GridSystem from "../../Scenes/Battleground/Systems/GridSystem";
import { BLUE_BONNET, VIVIRED_RED } from "../../Utils/colors";
import { getState, State } from "../../Models/State";
import * as TooltipSytem from "../Tooltip";
import { equipItem } from "../Item/EquipItem";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import * as ItemDrop from "../Item/ItemDrop";

export type Chara = {
	id: string;
	force: string;
	job: Job;
	sprite: Phaser.GameObjects.Image,
	scene: Phaser.Scene,
	unit: Unit,
	container: Phaser.GameObjects.Container,
	hightlightTween: Phaser.Tweens.Tween | null,
	atkDisplay: Phaser.GameObjects.Text,
	hpDisplay: Phaser.GameObjects.Text,
	equipDisplay: Phaser.GameObjects.Image,
	zone: Phaser.GameObjects.Zone,
}

let scene: Phaser.Scene;
let state: State;

const spriteSize = bgConstants.TILE_WIDTH - 4;

export function createChara(unit: Unit): Chara {

	const borderColor = unit.force === FORCE_ID_PLAYER ? BLUE_BONNET : VIVIRED_RED;

	const border = scene.add.rectangle(
		0, 0,
		spriteSize + 4, spriteSize + 4,
		borderColor, 1)
		.setOrigin(0.5, 0.5)

	const { sprite, shape } = portrait(unit);

	const container = scene.add.container(
		unit.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
		unit.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT
	)

	sprite.setName(unit.id) // used for scene-level drop events

	const textConfig = { ...bgConstants.defaultTextConfig, fontSize: '35px', color: '#ffffff' };

	const boxWidth = 50;
	const boxHeight = 50;
	const atkBg = scene.add.graphics();

	atkBg.fillStyle(0xff0000, 0.5);
	atkBg.fillRoundedRect(
		-bgConstants.HALF_TILE_WIDTH, bgConstants.HALF_TILE_HEIGHT - boxHeight,
		boxWidth, boxHeight,
		15
	);

	const atk = scene.add.text(
		-boxWidth, bgConstants.HALF_TILE_HEIGHT - boxHeight / 2,
		unit.attack.toString(),
		textConfig).setOrigin(0.5).setAlign('center');

	container.add([atkBg, atk])

	const hpBg = scene.add.graphics();
	hpBg.fillStyle(0x00ff00, 0.5);
	hpBg.fillRoundedRect(
		bgConstants.HALF_TILE_WIDTH - boxWidth, bgConstants.HALF_TILE_HEIGHT - boxHeight,
		boxWidth, boxHeight,
		10
	);
	const hp = scene.add.text(
		bgConstants.HALF_TILE_WIDTH - boxWidth / 2, bgConstants.HALF_TILE_HEIGHT - boxHeight / 2,
		unit.hp.toString(), textConfig)
		.setOrigin(0.5)
		.setAlign('center');

	container.add([hpBg, hp])

	//zone over the sprite for click/drag events
	const zone = scene.add.zone(
		0, 0,
		spriteSize, spriteSize
	).setOrigin(0.5, 0.5)
		.setName(unit.id) //needed for drop events

	container.add(zone);

	const item = renderItemSlot(unit, container);

	const chara: Chara = {
		id: unit.id,
		force: unit.force,
		job: getJob(unit.job),
		scene,
		sprite,
		container,
		unit,
		hightlightTween: null,
		atkDisplay: atk,
		hpDisplay: hp,
		zone,
		equipDisplay: item,
	};

	makeCharaInteractive(chara);

	// masks inside containers are currently not supported by phaser, so we need to manually follow the container
	// the container is still used to hold chara's aggregates (hp bar, icons, particles)
	const follow = () => {
		border.x = container.x;
		border.y = container.y;
		shape.x = container.x;
		shape.y = container.y;
		sprite.x = container.x + 20;
		sprite.y = container.y + 140;
	}

	scene.events.on('update', follow)
	container.on('destroy', () => {
		border.destroy();
		shape.destroy();
		sprite.destroy();
		scene.events.off('update', follow);
	})

	return chara
}

export const makeCharaInteractive = (chara: Chara) => {

	chara.zone.setInteractive({ draggable: true })

	chara.zone.on('drag', (pointer: Phaser.Input.Pointer) => {
		if (chara.unit.force !== FORCE_ID_PLAYER) return;
		chara.container.x = pointer.x;
		chara.container.y = pointer.y;
		TooltipSytem.hide();
	});

	chara.zone.on('drop', (
		pointer: Phaser.Input.Pointer,
		zone: Phaser.GameObjects.GameObject,
	) => {

		if (zone.name !== "board") return;

		const tile = GridSystem.getTileAt(pointer)!;

		const charaUnit = state.gameData.player.units.find(u => u.id === chara.id)!;

		const position = vec2(tile.x, tile.y)!

		const maybeOccupier = state.gameData.player.units.find(u => eqVec2(u.position, position));

		if (maybeOccupier) {
			const occupierChara = UnitManager.getChara(maybeOccupier.id);

			maybeOccupier.position = asVec2(charaUnit.position);

			tween({
				targets: [occupierChara.container],
				duration: 500,
				ease: 'Power2',
				x: maybeOccupier.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
				y: maybeOccupier.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT,
			})
		}

		charaUnit.position = position;

		tween({
			targets: [chara.container],
			duration: 500,
			ease: 'Power2',
			x: position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
			y: position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT,
		})

	});

	chara.zone.on('dragend', (pointer: Phaser.Input.Pointer) => {

		// check if the drag ended inside or outside scene.dropZone

		if (!UIManager.dropZone?.getBounds().contains(pointer.x, pointer.y)) {
			tween({
				targets: [chara.container],
				duration: 500,
				ease: 'Power2',
				x: chara.unit.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
				y: chara.unit.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT,
			})
		}

	})

	chara.zone.on('pointerover', () => {

		const text = [
			`${chara.job.name}`,
			`Attack: ${chara.unit.attack} HP: ${chara.unit.hp}`,
			chara.unit.traits.map((trait) => trait.description).join("\n"),
			`Equip: ${chara.unit.equip}`,
		].join('\n');

		TooltipSytem.render(
			chara.zone.parentContainer.x + 340,
			chara.zone.parentContainer.y,
			text,
		);
	})

	chara.zone.on('pointerout', () => {
		TooltipSytem.hide()
	})

}

export function portrait(unit: Unit) {
	const shape = scene.add.rectangle(0, 0, bgConstants.TILE_WIDTH, bgConstants.TILE_HEIGHT, 0xffffff);
	const mask = shape.createBitmapMask();

	const sprite = scene.add.image(0, 0, `charas/${unit.job}`);
	sprite.mask = mask;
	return { sprite, shape };
}

function renderItemSlot(unit: Unit, container: Phaser.GameObjects.Container) {
	const itemBorder = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		"ui/slot")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(80, 80);
	const item = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		unit.equip).setDisplaySize(60, 60).setOrigin(0.5, 0.5);

	if (unit.equip === "") {
		item.alpha = 0;
	}
	item.setInteractive({ draggable: true });
	item.on('dragstart', () => {
		scene.children.bringToTop(container);
	});
	item.on('drag', (pointer: Phaser.Input.Pointer) => {
		if (unit.force !== FORCE_ID_PLAYER) return;
		item.x = pointer.x - item.parentContainer.x;
		item.y = pointer.y - item.parentContainer.y;
	});

	item.on('pointerover', () => {
		const text = [
			`${unit.equip}`,
		];
		TooltipSytem.render(
			item.parentContainer.x + item.x + 300, item.parentContainer.y + item.y,
			text.join('\n'));
	});

	item.on('dragend', (pointer: Phaser.Input.Pointer) => {
		console.log("dragend", pointer.x, pointer.y);

		const closest = UnitManager.overlap(pointer);

		if (!closest) {
			// back to chest
			playerForce.items.push(unit.equip);
			equipItem({ unitId: unit.id, itemId: "" });
			UIManager.updateChest();
		} else {
			if (closest.unit.id === unit.id) { //self
				equipItem({ unitId: unit.id, itemId: "" });
			} else { //another
				const currEquip = closest.unit.equip;

				equipItem({ unitId: closest.id, itemId: unit.equip });
				equipItem({ unitId: unit.id, itemId: currEquip });

			}
		}
	});

	container.add([itemBorder, item]);
	return item;
}

export function destroyChara(chara: Chara) {
	// Remove event listeners
	chara.zone.removeAllListeners('drag');
	chara.zone.removeAllListeners('drop');
	chara.zone.removeAllListeners('dragend');

	// Clean up tweens
	if (chara.hightlightTween) {
		chara.hightlightTween.remove();
		chara.hightlightTween = null;
	}

	// Destroy container and contents
	chara.container.destroy();
}

export function init(sceneRef: Phaser.Scene) {

	scene = sceneRef;
	state = getState();

}

export function updateAtkDisplay(id: string, atk: number) {
	const chara = UnitManager.getChara(id);
	chara.atkDisplay.setText(atk.toString());
}

export function updateHpDisplay(id: string, hp: number) {
	const chara = UnitManager.getChara(id);
	chara.hpDisplay.setText(hp.toString());
}

export async function damageUnit(id: string, damage: number, isCritical = false) {
	const chara = UnitManager.getChara(id);

	const nextHp = chara.unit.hp - damage;
	const hasDied = nextHp <= 0;

	chara.unit.hp = nextHp <= 0 ? 0 : nextHp;
	chara.hpDisplay.setText(chara.unit.hp.toString());

	if (isCritical) {
		criticalDamageDisplay(scene, chara.container, damage, getState().options.speed);
	} else {
		popText({ text: damage.toString(), targetId: chara.id });
	}

	if (hasDied)
		await killUnit(chara)
	else
		await tween({
			targets: [chara.container],
			alpha: 0.5,
			duration: 100 / getState().options.speed,
			yoyo: true,
			repeat: 4,
		});
}

export async function killUnit(chara: Chara) {
	await tween({
		targets: [chara.container],
		alpha: 0,
		yoyo: true,
		duration: 250 / state.options.speed,
		repeat: 4,
		ease: 'Power2',
	});
	chara.container.destroy(true);

	ItemDrop.dropItem(chara);
}

