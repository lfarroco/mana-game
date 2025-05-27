import { Item } from "../../Models/Item";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { Chara } from "../Chara/Chara";

export type EquipItemArgs = {
	item: Item | null;
	chara: Chara;
}
const equipItemInChara = async ({ chara, item }: EquipItemArgs): Promise<void> => {

	if (item === null) {
		chara.equipDisplay.alpha = 0;
		return;
	}

	chara.equipDisplay.alpha = 1;
	chara.equipDisplay.setTexture(item ? item.icon : "empty");
	chara.equipDisplay.setDisplaySize(60, 60);
	chara.equipDisplay.setPosition(
		HALF_TILE_WIDTH - 40, -HALF_TILE_HEIGHT + 40
	);

}

export const equipItemInBoardUnit = async ({ chara, item }: EquipItemArgs): Promise<void> => {

	const currentItem = chara.unit.equip;

	if (currentItem !== null) {

		// TODO: on bench, don't propagate events to neighboring units
		if (currentItem.type.key === "equipment" && currentItem.name !== item?.name) {
			currentItem.type.onUnequip?.(chara.unit)();
		}

	}

	if (item !== null) {
		if (item.type.key === "equipment") {
			item.type.onEquip?.(chara.unit)();
		}
	}

	chara.unit.equip = item;

	equipItemInChara({ chara, item });
}

