import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { eqVec2, vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { playerForce } from "../../Models/Force";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import { getJob, Job } from "../../Models/Job";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import * as Chest from "../../Scenes/Battleground/Systems/Chest";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import * as GridSystem from "../../Scenes/Battleground/Systems/GridSystem";
import { BLUE_BONNET, VIVIRED_RED } from "../../Utils/colors";
import { getState, State } from "../../Models/State";
import * as TooltipSytem from "../Tooltip";
import { equipItemInUnit } from "../Item/EquipItem";
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
	atkDisplay: Phaser.GameObjects.Text,
	hpDisplay: Phaser.GameObjects.Text,
	equipDisplay: Phaser.GameObjects.Image,
	zone: Phaser.GameObjects.Zone,
}

let scene: Phaser.Scene;
let state: State;

const borderWidth = 4

export function createCard(unit: Unit): Chara {

	const borderColor = unit.force === FORCE_ID_PLAYER ? BLUE_BONNET : VIVIRED_RED;

	const border = scene.add.rectangle(
		0, 0,
		bgConstants.TILE_WIDTH, bgConstants.TILE_HEIGHT,
		borderColor, 1)
		.setOrigin(0.5, 0.5)


	const container = scene.add.container(
		unit.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
		unit.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT
	)

	const key = `charas/${unit.job}`
	const fallbackKey = 'charas/nameless'
	const textureKey = scene.textures.exists(key) ? key : fallbackKey;

	const sprite = scene.add.image(0, 0, textureKey)
		.setDisplaySize(bgConstants.TILE_WIDTH - borderWidth, bgConstants.TILE_HEIGHT - borderWidth)
		.setName(unit.id) // used for scene-level drop events

	container.add([border, sprite]);

	const textConfig = { ...bgConstants.titleTextConfig, fontSize: '24px' };

	const boxWidth = 60;
	const boxHeight = 50;

	const atkPosition: [number, number] = [
		-bgConstants.HALF_TILE_WIDTH + 10, bgConstants.HALF_TILE_HEIGHT - boxHeight - 10,
	]

	const atkBg = scene.add.graphics();

	atkBg.fillStyle(0x98240a, 1);
	atkBg.fillRoundedRect(
		...atkPosition,
		boxWidth, boxHeight,
		15
	);
	const atkBgCenter: [number, number] = [
		atkPosition[0] + boxWidth / 2, atkPosition[1] + boxHeight / 2,
	]
	const atk = scene.add.text(
		...atkBgCenter,
		unit.attackPower.toString(),
		textConfig
	)
		.setOrigin(0.5)
		.setAlign('center');

	container.add([atkBg, atk])

	const hpPosition: [number, number] = [
		bgConstants.HALF_TILE_WIDTH - boxWidth - 10, bgConstants.HALF_TILE_HEIGHT - boxHeight - 10,
	]
	const hpBg = scene.add.graphics();
	hpBg.fillStyle(0x327a0a, 1.0);
	hpBg.fillRoundedRect(
		...hpPosition,
		boxWidth, boxHeight,
		10
	);
	const hpBgCenter: [number, number] = [
		hpPosition[0] + boxWidth / 2, hpPosition[1] + boxHeight / 2,
	]
	const hp = scene.add.text(
		...hpBgCenter,
		unit.hp.toString(), textConfig)
		.setOrigin(0.5)
		.setAlign('center');

	container.add([hpBg, hp])

	//zone over the sprite for click/drag events
	const zone = scene.add.zone(
		0, 0,
		bgConstants.TILE_WIDTH, bgConstants.TILE_HEIGHT
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
		atkDisplay: atk,
		hpDisplay: hp,
		zone,
		equipDisplay: item,
	};

	return chara
}

export const addBoardEvents = (chara: Chara) => {

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

		// The board will change: remove position bonuses for all units
		state.gameData.player.units.forEach((unit) => {
			unit.events.onLeavePosition.forEach(fn => fn(unit)());
		});

		const tile = GridSystem.getTileAt(pointer)!;

		const charaUnit = state.gameData.player.units.find(u => u.id === chara.id)!;

		const position = vec2(tile.x, tile.y)!

		const maybeOccupier = state.gameData.player.units.find(u => eqVec2(u.position, position));

		if (maybeOccupier) {
			const occupierChara = UnitManager.getChara(maybeOccupier.id);

			charaUnit.position = position;

			tween({
				targets: [occupierChara.container],
				duration: 500,
				ease: 'Power2',
				x: maybeOccupier.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
				y: maybeOccupier.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT,
			})
		}

		charaUnit.position = position;

		// The board has changed: calculate position bonuses for all units
		state.gameData.player.units.forEach((unit) => {
			unit.events.onEnterPosition.forEach(fn => fn(unit)());
		});

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

}

export function addTooltip(chara: Chara) {
	chara.zone.on('pointerover', () => {

		const equipText = chara.unit.equip ?
			`${chara.unit.equip.name} : ${chara.unit.equip.description}` : 'No equip';;

		const text = [
			`Attack: ${chara.unit.attackPower} HP: ${chara.unit.hp}`,
			chara.unit.traits.map((trait) => trait.name).join("\n"),
			`${equipText}`,
		].join('\n');

		TooltipSytem.render(
			chara.zone.parentContainer.x + 340,
			chara.zone.parentContainer.y,
			chara.job.name,
			text,
		);
	})

	chara.zone.on('pointerout', () => {
		TooltipSytem.hide()
	})
}

function renderItemSlot(unit: Unit, container: Phaser.GameObjects.Container) {
	const itemBorder = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		"ui/slot")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(80, 80);
	const item = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		unit.equip?.icon || "empty"
	).setDisplaySize(60, 60).setOrigin(0.5, 0.5);

	if (unit.equip === null) {
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

	// TODO: move to Item module under "item tooltip"
	item.on('pointerover', () => {
		if (!unit.equip) return;
		TooltipSytem.render(
			item.parentContainer.x + item.x + 300, item.parentContainer.y + item.y,
			unit.equip.name,
			unit.equip.description,
		);
	});

	item.on('dragend', (pointer: Phaser.Input.Pointer) => {
		const closest = UnitManager.overlap(pointer);

		if (!closest) {
			// back to chest
			if (unit.equip) playerForce.items.push(unit.equip);

			equipItemInUnit({ unit, item: null });
			Chest.updateChestIO();
		} else {
			if (closest.unit.id === unit.id) { //self
				equipItemInUnit({ unit, item: unit.equip });
			} else { //another
				const currEquip = closest.unit.equip;

				equipItemInUnit({ unit: closest.unit, item: unit.equip });
				equipItemInUnit({ unit: unit, item: currEquip });

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

	// Destroy container and contents
	chara.container.destroy();
}

export function init(sceneRef: Phaser.Scene) {

	scene = sceneRef;
	state = getState();

}

export function updateAtkDisplay(id: string) {
	const chara = UnitManager.getChara(id);
	chara.atkDisplay.setText(chara.unit.attackPower.toString());
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

	if (hasDied) {
		await killUnit(chara)
		return
	}
	await tween({
		targets: [chara.container],
		alpha: 0.5,
		duration: 100 / getState().options.speed,
		yoyo: true,
		repeat: 4,
	});

	if (
		nextHp <= chara.unit.maxHp / 2 &&
		chara.unit.equip?.type.key === "equipment" &&
		chara.unit.equip.type.onHalfHP
	) {
		popText({
			text: chara.unit.equip.name,
			targetId: chara.id,
		})
		await chara.unit.equip.type.onHalfHP(chara.unit)();
	}

}

export async function killUnit(chara: Chara) {

	chara.unit.hp = 0;

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

	for (const ev of chara.unit.events.onDeath)
		await ev(chara.unit)()

}

// Function to update an attributattribute, not applying it (not apply damage of heal)
// This means changing the value of the card
export async function updateUnitAttribute<K extends keyof Unit>(
	unit: Unit,
	attribute: K,
	num: number,
) {
	const positive = num >= 0;
	const text = `${positive ? "+" : "-"}${num} ${attribute}`;

	if (typeof unit[attribute] === 'number') {
		(unit[attribute] as unknown as number) += num;
	} else {
		console.error(`Cannot add number to non-numeric attribute: ${attribute}`);
	}

	if (attribute === "attackPower") {
		updateAtkDisplay(unit.id);
	} else if (attribute === "maxHp") {
		unit.hp = unit.maxHp;
		updateHpDisplay(unit.id, unit.hp);
	}

	await popText({ text, targetId: unit.id, speed: 2 });
}
export function healUnit(unit: Unit, amount: number) {

	const nextHp = unit.hp + amount;

	unit.hp = nextHp > unit.maxHp ? unit.maxHp : nextHp;

	updateHpDisplay(unit.id, unit.hp);
}


