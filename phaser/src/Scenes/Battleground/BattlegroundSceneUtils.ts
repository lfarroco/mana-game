import { GameEvents } from "../../constants/events";
import { Unit } from "../../Models/Entities/Unit";

export const removeUnitFromPlayerState = (
	units: Unit[],
	unitId: string
): Unit[] => {
	const unitIndex = units.findIndex(u => u.id === unitId);
	if (unitIndex > -1) {
		units.splice(unitIndex, 1);
	} else {
		console.warn(`[BattlegroundScene] Unit with ID ${unitId} not found for selling.`);
	}
	return units;
};

export const handleOwnedUnitSold = (
	updatePlayerGold: (goldDelta: number) => void,
	emitEvent: (event: string, payload: any) => void,
	hideSellZone: () => void,
	units: Unit[],
	unitId: string,
	soldForGold: number,
	chara: { destroy: () => void; x: number; y: number } | null
): Unit[] => {
	updatePlayerGold(soldForGold);

	const popTextX = chara?.x ?? 0;
	const popTextY = chara?.y ?? 0;
	chara?.destroy();

	emitEvent(GameEvents.POP_TEXT_SHOW, {
		text: `+${soldForGold}G`,
		x: popTextX,
		y: popTextY,
		type: "success",
	});

	const updatedUnits = removeUnitFromPlayerState(units, unitId);
	hideSellZone();

	return updatedUnits;
};
