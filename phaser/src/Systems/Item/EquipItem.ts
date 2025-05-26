import { Item } from "../../Models/Item";
import { getBattleUnit, getGuildUnit, getState } from "../../Models/State";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { getChara } from "../../Scenes/Battleground/Systems/UnitManager";

export type EquipItemArgs = {
	item: Item | null;
	unit: Unit;
}
const equipItemInChara = async ({ unit, item }: EquipItemArgs): Promise<void> => {

	const chara = getChara(unit.id);

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

export const equipItemInUnit = async ({ unit, item }: EquipItemArgs): Promise<void> => {

	const currentItem = unit.equip;

	if (currentItem !== null) {

		if (currentItem.type.key === "equipment" && currentItem.name !== item?.name) {
			currentItem.type.onUnequip?.(unit)();
		}

	}

	if (item !== null) {
		if (item.type.key === "equipment") {
			item.type.onEquip?.(unit)();
		}
	}

	unit.equip = item;

	equipItemInChara({ unit, item });
}

export const burnConsumableInBattle = (unitId: string) => {
	const state = getState();

	const unit = getBattleUnit(state)(unitId)!;

	// remove item from battle unit
	unit.equip = null;

	// update display
	equipItemInChara({ unit, item: null });

	// propagate to guild unit
	const guildUnit = getGuildUnit(state)(unitId)!;
	guildUnit.equip = null;
}
