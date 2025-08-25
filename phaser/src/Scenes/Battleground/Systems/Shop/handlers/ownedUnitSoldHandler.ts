import * as Shop from "..";
import { updatePlayerGoldIO } from "../../../../../Models/Entities/Force";
import { Unit } from "../../../../../Models/Entities/Unit";
import { getState } from "../../../../../Models/State";
import { Chara } from "../../../../../Systems/Chara";
import { popText } from "../../../../../Systems/Chara/Animations/popText";

export function ownedUnitSoldHandler(payload: { unitId: string, soldForGold: number }): void {
	const { unitId, soldForGold } = payload;

	const state = getState();

	const chara = Chara.getCharaById(unitId);

	state.gameData.player.units = _handleOwnedUnitSold(
		(amount: number) => updatePlayerGoldIO(amount),
		Shop.UI.hideSellZone,
		state.gameData.player.units,
		unitId,
		soldForGold,
		chara,
		(x: number, y: number, text: string, type: string, direction: string) => {
			popText({
				x,
				y,
				text,
				type: type as "heal" | "damage" | "shield" | "poison" | "timeout",
				direction: direction as "up" | "down" | "left" | "right"
			});
		}
	);
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

export function _handleOwnedUnitSold(
	updatePlayerGold: (amount: number) => void,
	hideSellZone: () => void,
	units: Unit[],
	unitId: string,
	soldForGold: number,
	chara: { destroy: () => void; x: number; y: number } | undefined,
	showPopText: (x: number, y: number, text: string, type: string, direction: string) => void
): Unit[] {
	updatePlayerGold(soldForGold);

	const popTextX = chara?.x ?? 400;
	const popTextY = chara?.y ?? 300;
	chara?.destroy();

	showPopText(popTextX, popTextY, `+${soldForGold}G`, "shield", "up");

	hideSellZone();

	return removeUnitFromPlayerState(units, unitId);
}