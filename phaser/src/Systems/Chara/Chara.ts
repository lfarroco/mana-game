import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { eqVec2, vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import { getJob, Job } from "../../Models/Job";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import * as GridSystem from "../../Scenes/Battleground/Systems/GridSystem";
import { BLUE_BONNET, VIVIRED_RED } from "../../Utils/colors";
import { getState, State } from "../../Models/State";
import * as TooltipSytem from "../Tooltip";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { renderItemSlot } from "./ItemSlot";

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
	chargeBarBg: Phaser.GameObjects.Graphics,
	chargeBar: Phaser.GameObjects.Graphics,
}

export let scene: Phaser.Scene;
let state: State;

const borderWidth = 4
const boxWidth = 60;
const boxHeight = 50;

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



	const atkPosition: [number, number] = [
		-bgConstants.HALF_TILE_WIDTH + 10, bgConstants.HALF_TILE_HEIGHT - boxHeight - 10,
	]

	const atkBg = scene.add.graphics();

	// physical = red
	// magic = blue
	const color = unit.attackType === "magic" ? 0x0a4a98 : 0x98240a;
	atkBg.fillStyle(color, 1);
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

	// a bar based on the unit.charge value
	const chargeBarBg = scene.add.graphics();
	const chargeBar = scene.add.graphics();
	container.add([chargeBarBg, chargeBar]);

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
		chargeBarBg,
		chargeBar
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

export function updateChargeBar({ chargeBar, chargeBarBg, unit }: Chara) {
	chargeBar.clear();

	const maxWidth = bgConstants.TILE_WIDTH - 20;

	const percent = unit.charge / unit.agility;

	const calcWidth = () => Math.min(
		percent * maxWidth,
		maxWidth,
	);

	chargeBarBg.fillStyle(0x000000, 1);
	chargeBarBg.fillRect(
		-bgConstants.HALF_TILE_WIDTH + 10, - bgConstants.HALF_TILE_HEIGHT + 10,
		maxWidth, 10,
	);
	chargeBar.fillStyle(0xffff00, 1);
	chargeBar.fillRect(
		-bgConstants.HALF_TILE_WIDTH + 10, - bgConstants.HALF_TILE_HEIGHT + 10,
		calcWidth(), 10,
	);

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

	if (!chara || !chara.unit) {
		console.warn(`damageUnit: Chara ${id} not found`);
		return;
	}

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
		killUnit(chara)
		return;
	}

	if (
		nextHp <= chara.unit.maxHp / 2 &&
		chara.unit.equip?.type.key === "equipment" &&
		chara.unit.equip.type.onHalfHP
	) {
		popText({
			text: chara.unit.equip.name,
			targetId: chara.id,
		})
		chara.unit.equip.type.onHalfHP(chara.unit)();
	}

}

export async function killUnit(chara: Chara) {

	console.log(`Unit ${chara.unit.id} has died`);

	chara.unit.hp = 0;

	tween({
		targets: [chara.container],
		alpha: 0,
		yoyo: true,
		duration: 250 / state.options.speed,
		repeat: 4,
		ease: 'Power2',
	});
	chara.container.destroy(true);

	for (const ev of chara.unit.events.onDeath)
		ev(chara.unit)()

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


