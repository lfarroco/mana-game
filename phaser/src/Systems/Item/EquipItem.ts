import { getGuildUnit, getState } from "../../Models/State";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { getChara } from "../../Scenes/Battleground/Systems/UnitManager";

export type EquipItemArgs = {
	itemId: string;
	unitId: string;
}

export const equipItem = async ({ unitId, itemId }: EquipItemArgs): Promise<void> => {

	const state = getState();

	const unit = getGuildUnit(state)(unitId)!;
	const chara = getChara(unitId);

	unit.equip = itemId;

	if (itemId === "") {
		chara.equipDisplay.alpha = 0;
	} else {
		chara.equipDisplay.alpha = 1;
	}
	chara.equipDisplay.setTexture(itemId);
	chara.equipDisplay.setDisplaySize(60, 60);
	chara.equipDisplay.setPosition(
		HALF_TILE_WIDTH - 40, -HALF_TILE_HEIGHT + 40
	);
}
