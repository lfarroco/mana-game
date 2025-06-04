import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { eqVec2, vec2 } from "../../Models/Geometry";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import * as Board from "../../Models/Board";
import { addStatus, getState, State } from "../../Models/State";
import * as TooltipSytem from "../Tooltip";
import { popText } from "./Animations/popText";
import { criticalDamageDisplay } from "../../Effects";
import { images } from "../../assets";

export type Chara = {
	id: string;
	force: string;
	sprite: Phaser.GameObjects.Image,
	scene: Phaser.Scene,
	unit: Unit,
	container: Phaser.GameObjects.Container,
	atkDisplay: Phaser.GameObjects.Text,
	hpDisplay: Phaser.GameObjects.Text,
	zone: Phaser.GameObjects.Zone,
	chargeBar: Phaser.GameObjects.Graphics,
	cooldownBar: Phaser.GameObjects.Graphics,
	hpBar: Phaser.GameObjects.Graphics,
}

export let scene: Phaser.Scene;
let state: State;

const boxWidth = bgConstants.TILE_WIDTH * 0.4;
const boxHeight = bgConstants.TILE_HEIGHT * 0.2;

export function createCard(unit: Unit): Chara {

	const position = UnitManager.getCharaPosition(unit);
	const container = scene.add.container(
		position.x,
		position.y
	);

	const textureKey = scene.textures.exists(unit.name) ? unit.name : images.nameless.key;

	if (textureKey === images.nameless.key)
		console.warn(`Creating unit ${unit.id} with default texture ${textureKey}`);

	const sprite = scene.add.image(0, 0, textureKey)
		.setDisplaySize(bgConstants.TILE_WIDTH, bgConstants.TILE_HEIGHT)
		.setName(unit.id) // used for scene-level drop events

	if (unit.force === bgConstants.FORCE_ID_CPU) {
		sprite.flipX = true;
	}

	container.add([sprite]);

	const atkPosition: [number, number] = [
		-bgConstants.HALF_TILE_WIDTH + (boxWidth * 0.1),
		bgConstants.HALF_TILE_HEIGHT - boxHeight - (boxWidth * 0.1),
	]

	const atkBg = scene.add.graphics();

	atkBg.fillStyle(0xff0000, 1);
	atkBg.fillRoundedRect(
		...atkPosition,
		boxWidth, boxHeight,
		boxWidth * 0.1
	);
	const atkBgCenter: [number, number] = [
		atkPosition[0] + boxWidth / 2,
		atkPosition[1] + boxHeight / 2,
	]
	const atk = scene.add.text(
		...atkBgCenter,
		unit.attackPower.toString(),
		bgConstants.defaultTextConfig
	)
		.setOrigin(0.5)
		.setAlign('center');

	if (unit.attackType === "none") {
		atk.setAlpha(0);
		atkBg.setAlpha(0);
	}

	container.add([atkBg, atk])

	const hpPosition: [number, number] = [
		bgConstants.HALF_TILE_WIDTH - boxWidth - (boxWidth * 0.1),
		bgConstants.HALF_TILE_HEIGHT - boxHeight - (boxWidth * 0.1),
	]
	const hpBg = scene.add.graphics();
	hpBg.fillStyle(0x327a0a, 1.0);
	hpBg.fillRoundedRect(
		...hpPosition,
		boxWidth, boxHeight,
		boxWidth * 0.1
	);
	const hpBgCenter: [number, number] = [
		hpPosition[0] + boxWidth / 2, hpPosition[1] + boxHeight / 2,
	]
	const hp = scene.add.text(
		...hpBgCenter,
		unit.hp.toString(),
		bgConstants.defaultTextConfig
	)
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

	// a bar based on the unit.charge value
	const chargeBar = scene.add.graphics();
	const cooldownBar = scene.add.graphics();
	const hpBar = scene.add.graphics();

	container.add([chargeBar, cooldownBar, hpBar]);

	const chara: Chara = {
		id: unit.id,
		force: unit.force,
		scene,
		sprite,
		container,
		unit,
		atkDisplay: atk,
		hpDisplay: hp,
		zone,
		cooldownBar,
		chargeBar,
		hpBar,
	};

	UnitManager.addCharaToState(chara); // TODO: all created cards should be tracked in state

	return chara
}

export const addBoardEvents = (chara: Chara) => {

	chara.zone.setInteractive({
		draggable: chara.unit.force === FORCE_ID_PLAYER
	})

	chara.zone.on('dragstart', () => {
		chara.scene.children.bringToTop(chara.container);
	});

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

		if (zone.name === "slot") {

			const slotIndex = zone.getData("slot");
			scene.events.emit("unitDroppedInBenchSlot", chara.unit, slotIndex);
			return;

		}

		if (zone.name !== "board") return;

		// The board will change: remove position bonuses for all units
		state.gameData.player.units.forEach((unit) => {
			unit.events.onLeavePosition.forEach(fn => fn(unit)());
		});

		const tile = Board.getTileAt(pointer)!;

		const position = vec2(tile.x, tile.y)!

		const maybeOccupier = state.gameData.player.units.find(u => eqVec2(u.position, position));

		if (maybeOccupier) {
			const occupierChara = UnitManager.getChara(maybeOccupier.id);

			occupierChara.unit.position = { ...chara.unit.position };

			tween({
				targets: [occupierChara.container],
				...UnitManager.getCharaPosition(occupierChara.unit)
			})
		}

		chara.unit.position = position;

		// The board has changed: calculate position bonuses for all units
		state.gameData.player.units.forEach((unit) => {
			unit.events.onEnterPosition.forEach(fn => fn(unit)());
		});

		tween({
			targets: [chara.container],
			...UnitManager.getCharaPosition(chara.unit)
		})

	});

	chara.zone.on('dragend', (pointer: Phaser.Input.Pointer) => {

		if (UIManager.isPointerInDropZone(pointer)) return

		// check if the drag ended inside or outside scene.dropZone
		// return to original position if outside
		tween({
			targets: [chara.container],
			...UnitManager.getCharaPosition(chara.unit)
		})

	})

}

export function updateChargeBar({ chargeBar, cooldownBar, hpBar, unit }: Chara) {

	const maxWidth = bgConstants.TILE_WIDTH - 20;

	chargeBar.clear();
	const percent = unit.charge / unit.cooldown;

	let color = 0x000;

	if (unit.hasted > 0 && unit.slowed > 0)
		color = 0x000;
	else if (unit.hasted > 0)
		color = 0x00ff00;
	else if (unit.slowed > 0)
		color = 0xff0000;

	chargeBar.fillStyle(color, 0.2);
	chargeBar.fillRect(
		-bgConstants.HALF_TILE_WIDTH, -bgConstants.HALF_TILE_HEIGHT,
		bgConstants.TILE_WIDTH,
		bgConstants.TILE_HEIGHT - Math.min(percent * bgConstants.TILE_HEIGHT, bgConstants.TILE_HEIGHT)
	);

	if (!state.options.debug) return;

	cooldownBar.clear();
	const cooldownPercent = unit.refresh / bgConstants.MIN_COOLDOWN;
	cooldownBar.fillStyle(0xff0000, 1);
	cooldownBar.fillRect(
		-bgConstants.HALF_TILE_WIDTH + 10, - bgConstants.HALF_TILE_HEIGHT + 30,
		Math.min(cooldownPercent * maxWidth, maxWidth), 10
	);

	hpBar.clear();
	const hpPercent = unit.hp / unit.maxHp;
	hpBar.fillStyle(0x00ff00, 1);
	hpBar.fillRect(
		-bgConstants.HALF_TILE_WIDTH + 10, - bgConstants.HALF_TILE_HEIGHT + 50,
		Math.min(hpPercent * maxWidth, maxWidth), 10
	);

}

export function addTooltip(chara: Chara) {
	chara.zone.on('pointerover', () => {

		const text = [
			`Attack: ${chara.unit.attackPower} HP: ${chara.unit.hp}`,
			chara.unit.traits.map((trait) => trait.description).join("\n"),
		].join('\n');

		TooltipSytem.render(
			chara.zone.parentContainer.x + 340,
			chara.zone.parentContainer.y,
			chara.unit.name,
			text,
		);
	});

	chara.zone.on('pointerout', () => {
		TooltipSytem.hide()
	})
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
	if (!chara) return;
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
		criticalDamageDisplay(scene, chara.container, damage);
	} else {
		popText({ text: damage.toString(), targetId: chara.id, type: "damage" });
	}

	if (hasDied) {
		killUnit(chara)
		return;
	}

	if (
		nextHp <= chara.unit.maxHp / 2 &&
		chara.unit.equip?.type.key === "equipment" &&
		chara.unit.equip.type.onHalfHP &&
		!chara.unit.statuses["on-half-hp"]
	) {
		popText({
			text: chara.unit.equip.name,
			targetId: chara.id,
		})
		chara.unit.equip.type.onHalfHP(chara.unit)();
		addStatus(chara.unit, "on-half-hp");
	}

}

export async function killUnit(chara: Chara) {

	console.log(`Unit ${chara.unit.id} has died`);

	chara.unit.hp = 0;

	tween({
		targets: [chara.container],
		alpha: 0,
		duration: 1000,
	});

	const originalX = chara.container.x;

	for (let i = 0; i < 5; i++) {
		await tween({
			targets: [chara.container],
			x: originalX - 20,
			duration: 100,
			ease: "Cubic.Out",
		});

		await tween({
			targets: [chara.container],
			x: originalX + 20,
			duration: 100,
			ease: "Cubic.Out",
		});
	}

	await delay(scene, 2000);

	UnitManager.destroyChara(chara.id);

	state.battleData.units = state.battleData.units.filter(u => u.id !== chara.unit.id);

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


