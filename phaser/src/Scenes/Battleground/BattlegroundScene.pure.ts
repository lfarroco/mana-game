import { Unit } from "../../Models/Entities/Unit";

export function removeUnitFromPlayerState(units: Unit[], unitId: string): Unit[] {
	const unitIndex = units.findIndex(u => u.id === unitId);
	if (unitIndex > -1) {
		return units.filter(u => u.id !== unitId);
	} else {
		console.warn(`Unit with ID ${unitId} not found for selling.`);
		return [...units];
	}
}

export function handleOwnedUnitSold(
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