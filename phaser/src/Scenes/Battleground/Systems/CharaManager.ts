import { Unit } from "../../../Models/Entities/Unit";
import * as Chara from "../../../Systems/Chara/Chara";
import { vec2 } from "../../../Models/Geometry";
import { summonEffect } from "../../../Effects/summonEffect";
import * as constants from "../../../constants/constants";
import { tween } from "../../../Utils/animation";
import { scene } from "../BattlegroundScene";


const charaIndex: Chara.Chara[] = [];

export function clearCharas() {
	[...charaIndex].forEach(chara => {
		destroyChara(chara.id);
	});
	if (charaIndex.length > 0) {
		console.warn("CharaManager: charaIndex not empty after clearCharas loop. Forcibly clearing.");
		charaIndex.length = 0;
	}
}

export function destroyChara(id: string) {
	const charaIndexPos = charaIndex.findIndex(chara => chara.id === id);

	if (charaIndexPos !== -1) {
		const charaInstance = charaIndex[charaIndexPos];

		charaIndex.splice(charaIndexPos, 1);
		charaInstance.destroy();
	}
}
export async function summonChara(
	unit: Unit,
	useSummonEffect = true,
) {
	const vec = getCharaPosition(unit);

	if (useSummonEffect) {
		summonEffect(scene, vec);
	}

	const chara = new Chara.Chara(unit);

	chara.setBarsVisibility(false);
	chara.container.setScale(0);
	chara.container.setAngle(-10);
	await tween({
		targets: [chara.container],
		scale: 1,
		angle: 0,
		ease: "Back.easeOut",
		duration: 500,
	});
	chara.setBarsVisibility(true);

	registerChara(chara);

	return chara;
}

export function registerChara(chara: Chara.Chara) {
	if (!charaIndex.some(c => c.id === chara.id)) {
		charaIndex.push(chara);
	} else {
		console.warn(`CharaManager: Attempted to register chara with id ${chara.id} which is already registered.`);
	}
}

// TODO: move to chara
export function getCharaPosition(unit: Unit) {
	const slotSpacing = 8;
	const offsetX = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X;
	const offsetY = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_Y : constants.CPU_BOARD_Y;

	let visualX = unit.position.x;
	if (unit.force === constants.FORCE_ID_CPU) {
		visualX = 2 - unit.position.x;
	}

	return vec2(
		visualX * (constants.TILE_WIDTH + slotSpacing) + constants.HALF_TILE_WIDTH + offsetX,
		unit.position.y * (constants.TILE_HEIGHT + slotSpacing) + constants.HALF_TILE_HEIGHT + offsetY
	);
}

export function getChara(id: string) {

	const maybeChara = charaIndex.find((chara) => chara.id === id);

	if (!maybeChara)
		throw new Error(`Chara with id ${id} not found.`);

	return maybeChara
}

export function getAllCharas() {
	return charaIndex;
}

export const getSurroundingAllies = (unit: Unit) => {
	return charaIndex
		.filter(chara => chara.unit.force === unit.force)
		.filter(chara => chara.id !== unit.id)
		.filter(chara => {
			const distance = Phaser.Math.Distance.BetweenPoints(
				unit.position,
				chara.unit.position
			);
			return distance === 1;
		});
}

export function handleSummonCharaToBoardEvent(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void {
	summonChara(payload.unit, payload.animateAppear);
}

export function handleCharaChargeBarUpdateEvent(payload: { unitId: string }): void {
	getChara(payload.unitId)?.updateChargeBar();
}

export function handleCharaBarsVisibilitySetEvent(payload: { unitId: string, visible: boolean }): void {
	getChara(payload.unitId)?.setBarsVisibility(payload.visible);
}