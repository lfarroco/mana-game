import { Item } from "../../../Models/Item";
import { State } from "../../../Models/State";
import * as Tooltip from "../../../Systems/Tooltip";
import { titleTextConfig } from "../constants";
import { overlap, getChara } from "./CharaManager";
import { CHEST_TILE_SIZE, render } from "./Guild";


export const renderVault = (
	scene: Scene,
	parent: Container,
	state: State,
	sellImage: Image,
	benchSlots: Image[]
) => {
	const baseX = 120;
	const baseY = 570;
	const gridWidth = 5;
	const gridHeight = 2;
	const spacing = 16;

	const w = CHEST_TILE_SIZE + spacing;
	const h = CHEST_TILE_SIZE + spacing;

	const itemsTitle = scene.add.text(
		50,
		baseY - 130,
		"Guild Vault",
		titleTextConfig);
	parent.add(itemsTitle);

	// Build slots array: each slot has index, position, item, and slotImage
	const slots: Array<{
		index: number;
		position: [number, number];
		item: Item | null;
		slotImage?: Phaser.GameObjects.Image;
	}> = new Array(gridWidth * gridHeight).fill(0).map((_, index) => {
		const x = index % gridWidth;
		const y = Math.floor(index / gridWidth);
		const position: [number, number] = [
			baseX + (x * CHEST_TILE_SIZE) + (x * spacing),
			baseY + (y * CHEST_TILE_SIZE) + (y * spacing)
		];
		return {
			index,
			position,
			item: state.gameData.player.items[index] || null,
			w,
			h
		};
	});

	slots.forEach((slot, slotIdx) => {
		const { position, item } = slot;
		const slotImage = scene.add.image(0, 0, "ui/slot")
			.setOrigin(0.5)
			.setDisplaySize(w, h)
			.setPosition(...position);
		parent.add([slotImage]);
		slot.slotImage = slotImage;

		slotImage.setInteractive({ useHandCursor: true });
		slotImage.on("dragover", (pointer: Phaser.Input.Pointer) => {
			if (Phaser.Geom.Intersects.RectangleToRectangle(
				new Phaser.Geom.Rectangle(pointer.x, pointer.y, 1, 1),
				slotImage.getBounds()
			)) {
				slotImage.setTint(0x00ff00);
			}
		});

		if (!item) return;

		const icon = scene.add.image(0, 0, item.icon)
			.setDisplaySize(CHEST_TILE_SIZE, CHEST_TILE_SIZE)
			.setOrigin(0.5)
			.setName(item.id);
		icon.setPosition(...position);
		parent.add(icon);

		icon.setInteractive({ draggable: true });
		icon.on("pointerover", () => {
			Tooltip.render(
				icon.x + 400, icon.y + 100,
				item.name,
				item.description
			);
		});
		icon.on("pointerout", () => {
			Tooltip.hide();
		});
		icon.on("dragstart", () => {
			Tooltip.hide();
			parent.bringToTop(icon);
		});
		icon.on("drag", (pointer: Phaser.Input.Pointer) => {
			icon.x = pointer.x;
			icon.y = pointer.y;
		});
		icon.on("dragend", (pointer: Phaser.Input.Pointer) => {
			const targetChara = overlap(pointer);
			if (targetChara && state.gameData.player.units.find(chara => chara.id === targetChara.unit.id)) {
				scene.events.emit("itemDroppedOnChara", targetChara, icon, item);
				render(scene, parent);
				return;
			}

			// check if overlaps with charas in the bench
			benchSlots.forEach((slot, i) => {

				const intersects = Phaser.Geom.Intersects.RectangleToRectangle(
					slot.getBounds(),
					icon.getBounds()
				);

				if (intersects) {
					const benchSlot = state.gameData.player.bench[i];
					if (benchSlot && benchSlot.unit) {
						const chara = getChara(benchSlot.unit.id);
						scene.events.emit("itemDroppedOnBenchChara", chara, icon, item);
						render(scene, parent);
						return;
					}
				}
			});

			if (Phaser.Geom.Intersects.RectangleToRectangle(
				icon.getBounds(),
				sellImage.getBounds()
			)) {
				scene.events.emit("itemSell", icon, item);
				render(scene, parent);
				return;
			}
			// check if dropped over another slot
			const targetSlot = slots.find(s => s.slotImage && Phaser.Geom.Intersects.RectangleToRectangle(
				new Phaser.Geom.Rectangle(pointer.x, pointer.y, 1, 1),
				s.slotImage.getBounds()
			));
			if (targetSlot) {
				const fromIdx = slotIdx;
				const toIdx = targetSlot.index;
				if (slots[toIdx].item) {
					// swap
					const temp = slots[toIdx].item;
					slots[toIdx].item = slots[fromIdx].item;
					slots[fromIdx].item = temp;
				} else {
					// move
					slots[toIdx].item = slots[fromIdx].item;
					slots[fromIdx].item = null;
				}
				// update state items array
				state.gameData.player.items = slots.map(s => s.item);
				render(scene, parent);
				return;
			}
			// nothing happened, return to original position
			icon.setPosition(...position);
			return;
		});
	});
};
