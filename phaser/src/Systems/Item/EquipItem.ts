import { Item } from "../../Models/Item";
import { getGuildUnit, getState } from "../../Models/State";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { getChara } from "../../Scenes/Battleground/Systems/UnitManager";

export type EquipItemArgs = {
	item: Item | null;
	unitId: string;
}

export const equipItem = async ({ unitId, item }: EquipItemArgs): Promise<void> => {

	const state = getState();

	const unit = getGuildUnit(state)(unitId)!;
	const chara = getChara(unitId);

	unit.equip = item;

	if (item === null) {
		chara.equipDisplay.alpha = 0;
	} else {
		chara.equipDisplay.alpha = 1;
	}
	chara.equipDisplay.setTexture(item ? item.icon : "empty");
	chara.equipDisplay.setDisplaySize(60, 60);
	chara.equipDisplay.setPosition(
		HALF_TILE_WIDTH - 40, -HALF_TILE_HEIGHT + 40
	);
}
