import * as Shop from "..";
import { updatePlayerGoldIO } from "../../../../../Models/Entities/Force";
import { Unit } from "../../../../../Models/Entities/Unit";
import { getState } from "../../../../../Models/State";
import { Chara } from "../../../../../Systems/Chara";
import { popText } from "../../../../../Systems/Chara/Animations/popText";

export function ownedUnitSold(unitId: string, soldForGold: number) {

	const state = getState();

	const chara = Chara.getCharaById(unitId);

	updatePlayerGoldIO(soldForGold);

	const popTextX = chara?.x ?? 400;
	const popTextY = chara?.y ?? 300;
	chara?.destroy();

	popText({
		x: popTextX,
		y: popTextY,
		text: `+${soldForGold}G`,
		type: "shield",
		direction: "up"
	});

	Shop.UI.hideSellZone()

	return removeUnitFromPlayerState(state.gameData.player.units, unitId);
}

export function removeUnitFromPlayerState(units: Unit[], unitId: string): Unit[] {
	const unitIndex = units.findIndex(u => u.id === unitId);
	if (unitIndex > -1) {
		return units.filter(u => u.id !== unitId);
	} else {
		console.warn(`Unit with ID ${unitId} not found for selling.`);
		return [...units];
	}
}