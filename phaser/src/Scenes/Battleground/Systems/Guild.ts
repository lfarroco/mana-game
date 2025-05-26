import { getState, State } from "../../../Models/State";
import { Chara } from "../../../Systems/Chara/Chara";
import * as Flyout_ from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { destroyChara, getChara, overlap, summonChara } from "./UnitManager";
import { coinDropIO } from "./UIManager";

import { Item } from "../../../Models/Item";
import { equipItemInBoardUnit } from "../../../Systems/Item/EquipItem";
import { Unit } from "../../../Models/Unit";
import { updatePlayerGoldIO } from "../../../Models/Force";
import { renderBench } from "./GuildBench";

const CHEST_TILE_SIZE = constants.TILE_WIDTH / 2;

let initialized = false;

// Module-scoped variable for flyout and container
let guildFlyout: Flyout_.Flyout | null = null;
let flyoutContainer: Container | null = null;

// Event handler for unit dropped in bench slot
function onUnitDroppedInBenchSlot(unit: Unit, index: number) {
	const state = getState();
	const slot = state.gameData.player.bench[index];
	const occupier = slot && slot.unit;
	if (occupier) {
		occupier.position = unit.position;
		state.gameData.player.units.push(occupier);
		summonChara(occupier, true);
	}
	state.gameData.player.bench[index] = { index, unit };
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);
	state.battleData.units = state.battleData.units.filter(u => u.id !== unit.id);
	destroyChara(unit.id);

	// Rerender the flyout contents if open
	if (!guildFlyout) return;

	const { scene, isOpen } = guildFlyout;
	if (isOpen && flyoutContainer) {
		render(scene, flyoutContainer);
	}
}

// Event handler for unit sell
function onUnitSell(chara: Chara) {
	const state = getState();
	const unit = chara.unit;
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);
	state.battleData.units = state.battleData.units.filter(u => u.id !== unit.id);
	const benchIndex = state.gameData.player.bench.findIndex(b => b.unit && b.unit.id === unit.id);
	if (benchIndex !== -1) {
		state.gameData.player.bench[benchIndex] = { index: benchIndex, unit: null };
	}
	chara.container.destroy();
	coinDropIO(10, 10, chara.container.x, chara.container.y);
	updatePlayerGoldIO(10);
}

// Event handler for item sell
function onItemSell(icon: Phaser.GameObjects.Image, item: Item) {
	const state = getState();
	icon.destroy();
	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);
	coinDropIO(item.cost / 2, item.cost / 2, icon.x, icon.y);
}

// Event handler for item dropped on chara
function onItemDroppedOnChara(targetChara: Chara, icon: Phaser.GameObjects.Image, item: Item) {
	const state = getState();
	icon.destroy();
	const currentItem = targetChara.unit.equip;
	equipItemInBoardUnit({ chara: targetChara, item });
	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);
	if (currentItem !== null) {
		state.gameData.player.items.push(currentItem);
	}
}


export async function renderGuildButton(scene: Phaser.Scene) {
	const flyout = await Flyout_.create(scene, "Your Guild")
	const container = scene.add.container(0, 0);
	flyout.add(container);

	// Store references for event handlers in module scope
	guildFlyout = flyout;
	flyoutContainer = container;

	scene.add.image(
		...[
			constants.SCREEN_WIDTH - 120,
			constants.SCREEN_HEIGHT - 560
		],
		"ui/guild")
		.setOrigin(0.5)
		.setDisplaySize(230, 230)
		.setInteractive()
		.on("pointerup", () => handleButtonClicked(container, flyout)());

	if (initialized) return;
	// Register event handlers only once
	scene.events.on("unitDroppedInBenchSlot", onUnitDroppedInBenchSlot);
	scene.events.on("unitSell", onUnitSell);
	scene.events.on("itemSell", onItemSell);
	scene.events.on("itemDroppedOnChara", onItemDroppedOnChara);
	scene.events.on("itemDroppedOnBenchChara", onItemDroppedOnChara);

	initialized = true;

}

const handleButtonClicked = (container: Container, flyout: Flyout_.Flyout) => async () => {
	if (flyout.isOpen) {
		flyout.slideOut();
		return;
	}
	render(container.scene, container);
	await flyout.slideIn();
}

export function render(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {

	parent.removeAll(true);

	const state = getState();

	const update = () => {

		parent.removeAll(true);

		const sellImage = sellZone(scene, parent);

		const benchSlots = renderBench(scene, parent, state, sellImage);

		const itemsTitle = scene.add.text(
			50,
			400,
			"Items",
			constants.titleTextConfig);
		parent.add(itemsTitle);


		renderItems(scene, parent, state, sellImage, benchSlots);

	}

	update();

}

export const renderItems = (
	scene: Scene,
	parent: Container,
	state: State,
	sellImage: Image,
	benchSlots: Image[]
) => {
	const baseX = 120;
	const baseY = 530;
	const gridWidth = 4;
	const gridHeight = 2;
	const spacing = 16;

	const w = CHEST_TILE_SIZE + spacing;
	const h = CHEST_TILE_SIZE + spacing;

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

function sellZone(scene: Scene, parent: Container) {

	const sellImage = scene.add.image(
		400, constants.SCREEN_HEIGHT - 200,
		"icon/sell"
	)
		.setDisplaySize(400, 250)

	const sellText = scene.add.text(
		400, constants.SCREEN_HEIGHT - 150,
		"Sell",
		constants.defaultTextConfig,
	)
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14)
		;

	parent.add([sellImage, sellText]);

	return sellImage

}
