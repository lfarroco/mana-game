import Phaser from "phaser";
import { playerForce } from "../../Models/Force";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import * as Chest from "../../Scenes/Battleground/Systems/Chest";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import { equipItemInUnit } from "../Item/EquipItem";
import * as TooltipSytem from "../Tooltip";
import { scene } from "./Chara";

export function renderItemSlot(unit: Unit, container: Phaser.GameObjects.Container) {
	const itemBorder = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		"ui/slot")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(80, 80)
		.setAlpha(0);
	const item = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		unit.equip?.icon || "empty"
	).setDisplaySize(60, 60).setOrigin(0.5, 0.5);

	if (unit.equip === null) {
		item.alpha = 0;
	}
	item.setInteractive({ draggable: true });
	item.on('dragstart', () => {
		scene.children.bringToTop(container);
	});
	item.on('drag', (pointer: Phaser.Input.Pointer) => {
		if (unit.force !== FORCE_ID_PLAYER) return;
		item.x = pointer.x - item.parentContainer.x;
		item.y = pointer.y - item.parentContainer.y;
	});

	// TODO: move to Item module under "item tooltip"
	item.on('pointerover', () => {
		if (!unit.equip) return;
		TooltipSytem.render(
			item.parentContainer.x + item.x + 300, item.parentContainer.y + item.y,
			unit.equip.name,
			unit.equip.description
		);
	});

	item.on('dragend', (pointer: Phaser.Input.Pointer) => {
		const closest = UnitManager.overlap(pointer);

		if (!closest) {
			// back to chest
			if (unit.equip) playerForce.items.push(unit.equip);

			equipItemInUnit({ unit, item: null });
			Chest.updateChestIO();
		} else {
			if (closest.unit.id === unit.id) { //self
				equipItemInUnit({ unit, item: unit.equip });
			} else { //another
				const currEquip = closest.unit.equip;

				equipItemInUnit({ unit: closest.unit, item: unit.equip });
				equipItemInUnit({ unit: unit, item: currEquip });

			}
		}
	});

	container.add([itemBorder, item]);
	return item;
}
