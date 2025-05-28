import Phaser from "phaser";
import { playerForce } from "../../Models/Force";
import * as bgConstants from "../../Scenes/Battleground/constants";
import { FORCE_ID_PLAYER } from "../../Scenes/Battleground/constants";
import * as UnitManager from "../../Scenes/Battleground/Systems/CharaManager";
import { equipItemInBoardUnit } from "../Item/EquipItem";
import * as TooltipSytem from "../Tooltip";
import { scene } from "./Chara";
import { Unit } from "../../Models/Unit";
import { sellImage } from "../../Scenes/Battleground/Systems/Guild";
import { vaultState } from "../../Scenes/Battleground/Systems/GuildVault";

export function renderItemSlot(
	unit: Unit,
	container: Container,
) {

	const itemBorder = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		"ui/slot")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(80, 80);

	const itemIcon = scene.add.image(
		bgConstants.HALF_TILE_WIDTH - 40, -bgConstants.HALF_TILE_HEIGHT + 40,
		unit.equip?.icon || "empty"
	).setDisplaySize(60, 60)
		.setOrigin(0.5, 0.5);

	container.add([itemBorder, itemIcon]);

	if (unit.equip === null) {
		itemIcon.alpha = 0;
	}

	itemIcon.setInteractive({ draggable: true });
	itemIcon.on('dragstart', () => {
		container.remove(itemIcon)
	});
	itemIcon.on('drag', (pointer: Phaser.Input.Pointer) => {
		if (unit.force !== FORCE_ID_PLAYER) return;
		itemIcon.x = pointer.x;
		itemIcon.y = pointer.y;
	});

	// TODO: move to Item module under "item tooltip"
	itemIcon.on('pointerover', () => {
		if (!unit.equip) return;
		TooltipSytem.render(
			itemIcon.parentContainer.x + itemIcon.x + 300, itemIcon.parentContainer.y + itemIcon.y,
			unit.equip.name,
			unit.equip.description
		);
	});

	itemIcon.on('dragend', (pointer: Phaser.Input.Pointer) => {
		const droppedOnChara = UnitManager.overlap(pointer);

		const chara = UnitManager.getChara(unit.id);

		if (droppedOnChara) {
			if (droppedOnChara.unit.id === unit.id) { //self
				equipItemInBoardUnit({ chara, item: unit.equip });
			} else { //another
				const currEquip = droppedOnChara.unit.equip;

				equipItemInBoardUnit({ chara: droppedOnChara, item: unit.equip });
				equipItemInBoardUnit({ chara, item: currEquip });

			}

			return;
		}

		if (sellImage) {
			const sells = Phaser.Geom.Intersects.RectangleToRectangle(
				itemIcon.getBounds(), sellImage?.getBounds())

			if (sells) {

				scene.events.emit("itemSell", itemIcon, unit.equip);
				equipItemInBoardUnit({ chara, item: null });
				return;
			}

		}

		const vaultSlot = vaultState.slots.find(({ position, size }) => Phaser.Geom.Intersects.RectangleToRectangle(
			new Phaser.Geom.Rectangle(pointer.x, pointer.y, 1, 1),
			new Phaser.Geom.Rectangle(...position, ...size),
		));

		if (vaultSlot) {

			const { item, index } = vaultSlot

			scene.events.emit("itemDroppedOnVaultSlot", unit.equip, index);

			equipItemInBoardUnit({ chara, item });

			return;

		}

		// back to chest
		if (unit.equip) playerForce.items.push(unit.equip);

		equipItemInBoardUnit({ chara, item: null });
		//update guild

	});

	return itemIcon;
}
