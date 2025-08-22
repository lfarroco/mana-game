import { Unit } from "../../../Models/Entities/Unit";
import * as Chara from "../../../Systems/Chara/Chara";
import { summonEffect } from "../../../Effects/summonEffect";
import { tween } from "../../../Utils/animation";
import { scene } from "../BattlegroundScene";
import { getCharaPosition } from "../../../Systems/Chara/Chara";


const charaIndex: Chara.Chara[] = [];

export function clearCharas() {
	[...charaIndex].forEach(chara => {
		destroyChara(Chara.getId(chara));
	});
	if (charaIndex.length > 0) {
		console.warn("CharaManager: charaIndex not empty after clearCharas loop. Forcibly clearing.");
		charaIndex.length = 0;
	}
}

export function destroyChara(id: string) {
	const charaIndexPos = charaIndex.findIndex(chara => Chara.getId(chara) === id);

	if (charaIndexPos !== -1) {
		const charaInstance = charaIndex[charaIndexPos];

		charaIndex.splice(charaIndexPos, 1);
		Chara.destroy(charaInstance);
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

	const chara = Chara.create(unit);

	Chara.setBarsVisibility(chara, false);
	chara.setScale(0);
	chara.setAngle(-10);
	await tween({
		targets: [chara],
		scale: 1,
		angle: 0,
		ease: "Back.easeOut",
		duration: 500,
	});
	Chara.setBarsVisibility(chara, true);

	return chara;
}

export function registerChara(chara: Chara.Chara) {
	if (!charaIndex.some(c => Chara.getId(c) === Chara.getId(chara))) {
		charaIndex.push(chara);
	} else {
		console.warn(`CharaManager: Attempted to register chara with id ${Chara.getId(chara)} which is already registered.`);
	}
}

// positioning now provided by Chara.getCharaPosition

export function getChara(id: string) {
	const maybeChara = charaIndex.find((chara) => Chara.getId(chara) === id);

	if (!maybeChara)
		throw new Error(`Chara with id ${id} not found.`);

	return maybeChara
}

export function getAllCharas() {
	return charaIndex;
}

export const getSurroundingAllies = (unit: Unit) => {
	return charaIndex
		.filter(chara => Chara.getUnit(chara).force === unit.force)
		.filter(chara => Chara.getId(chara) !== unit.id)
		.filter(chara => {
			const distance = Phaser.Math.Distance.BetweenPoints(
				unit.position,
				Chara.getUnit(chara).position
			);
			return distance === 1;
		});
}

export function handleSummonCharaToBoardEvent(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void {
	summonChara(payload.unit, payload.animateAppear);
}

export function handleCharaChargeBarUpdateEvent(payload: { unitId: string }): void {
	const chara = getChara(payload.unitId);
	Chara.updateChargeBar(chara);
}

export function handleCharaBarsVisibilitySetEvent(payload: { unitId: string, visible: boolean }): void {
	const chara = getChara(payload.unitId);
	Chara.setBarsVisibility(chara, payload.visible);
}