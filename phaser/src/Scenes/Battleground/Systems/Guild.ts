import { getState, State } from "../../../Models/State";
import { addTooltip, Chara, createCard } from "../../../Systems/Chara/Chara";
import * as Flyout_ from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { getTileAt } from "./GridSystem";
import { destroyChara, overlap, summonChara } from "./UnitManager";
import { coinDropIO } from "./UIManager";
import { overlapsWithPlayerBoard } from "../../../Models/Board";
import { Item } from "../../../Models/Item";
import { equipItemInUnit } from "../../../Systems/Item/EquipItem";
import { Unit } from "../../../Models/Unit";
import { updatePlayerGoldIO } from "../../../Models/Force";
import { handleUnitDrop } from "./GuildDragHandlers";
import { getBenchSlotPosition, getBenchCardPosition } from "./GuildRenderHelpers";

const CHEST_TILE_SIZE = constants.TILE_WIDTH / 2;
let initialized = false;

export async function renderGuildButton(scene: Phaser.Scene) {

	const flyout = await Flyout_.create(scene, "Your Guild")
	const container = scene.add.container(0, 0);
	flyout.add(container);

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

}

const handleButtonClicked = (container: Container, flyout: Flyout_.Flyout) => async () => {

	if (flyout.isOpen) {
		flyout.slideOut();
		return;
	}

	render(container.scene, container);

	if (!initialized) {
		container.scene.events.on("unitDroppedInBenchSlot", handleUnitDroppedInBenchSlot);

		container.scene.events.on("unitDroppedInBenchSlot", () => {
			render(container.scene, container);
		});
		initialized = true;
	}

	await flyout.slideIn();
}

const handleUnitDroppedInBenchSlot = (unit: Unit, index: number) => {

	const state = getState();

	const slot = state.gameData.player.bench[index];
	const occupier = slot && slot.unit;

	if (occupier) {
		occupier.position = unit.position;
		state.gameData.player.units.push(occupier);
		summonChara(occupier, true);
	}

	// Place the new unit in the slot
	state.gameData.player.bench[index] = { index, unit };
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);
	state.battleData.units = state.battleData.units.filter(u => u.id !== unit.id);

	destroyChara(unit.id);

}

export function render(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {

	parent.removeAll(true);

	const state = getState();

	const update = () => {

		parent.removeAll(true);

		const sellImage = sellZone(scene, parent);

		renderBench(scene, parent, state, sellImage);

		const itemsTitle = scene.add.text(
			50,
			400,
			"Items",
			constants.titleTextConfig);
		parent.add(itemsTitle);


		renderItems(scene, parent, state, sellImage);

	}

	update();

}

function renderBench(
	scene: Phaser.Scene,
	parent: Container,
	state: State,
	sellImage: Phaser.GameObjects.Image
) {
	const benchTitle = scene.add.text(
		50,
		80,
		"Bench",
		constants.titleTextConfig);
	parent.add(benchTitle);

	// Use the bench array directly (already { index, unit })
	const benchSlots = state.gameData.player.bench;

	benchSlots.forEach(({ index }) => {
		const { x, y } = getBenchSlotPosition(index);
		const w = constants.TILE_WIDTH + 20;
		const h = constants.TILE_HEIGHT + 20;
		const slot = scene.add.image(x, y, "ui/slot").setDisplaySize(w, h).setOrigin(0);
		const zone = scene.add.zone(x, y, w, h)
			.setPosition(x, y)
			.setName("slot")
			.setDataEnabled()
			.setData("slot", index)
			.setOrigin(0)
			.setRectangleDropZone(w, h);
		parent.add([slot, zone]);
		if (!state.options.debug) return;
		const dropZoneDisplay = scene.add.graphics();
		dropZoneDisplay.lineStyle(2, 0xffff00);
		dropZoneDisplay.fillStyle(0x00ffff, 0.3);
		dropZoneDisplay.fillRect(x, y, w, h);
		dropZoneDisplay.strokeRect(x, y, w, h);
		parent.add([dropZoneDisplay]);
	});

	benchSlots.forEach(({ index, unit }) => {
		if (!unit) return;
		const chara = createCard(unit);
		const { x, y } = getBenchCardPosition(index);
		chara.container.setPosition(x, y);
		chara.zone.setInteractive({ draggable: true });
		addTooltip(chara);
		parent.add(chara.container);
		chara.zone.on("dragstart", () => { Tooltip.hide(); });
		chara.zone.on('dragend', (pointer: Phaser.Input.Pointer) => {
			const result = handleUnitDrop({
				chara,
				pointer,
				scene,
				parent,
				sellImage,
				render,
				getTileAt,
				overlapsWithPlayerBoard
			});
			if (result === "sell") {
				handleUnitSell(chara);
				return;
			}

			// --- BENCH SLOT DRAG & DROP ---
			// Check if dropped over a bench slot
			const dropBenchSlot = benchSlots.find(({ index: slotIdx }) => {
				const { x: slotX, y: slotY } = getBenchSlotPosition(slotIdx);
				const w = constants.TILE_WIDTH + 20;
				const h = constants.TILE_HEIGHT + 20;
				return (
					pointer.x >= slotX && pointer.x <= slotX + w &&
					pointer.y >= slotY && pointer.y <= slotY + h
				);
			});
			if (dropBenchSlot) {
				const fromIdx = index;
				const toIdx = dropBenchSlot.index;
				if (fromIdx !== toIdx) {
					const fromUnit = state.gameData.player.bench[fromIdx].unit;
					const toUnit = state.gameData.player.bench[toIdx].unit;
					// Swap or move
					state.gameData.player.bench[fromIdx].unit = toUnit || null;
					state.gameData.player.bench[toIdx].unit = fromUnit;
					render(scene, parent);
					return;
				}
			}
		});
		chara.zone.on("drag", (pointer: Phaser.Input.Pointer) => {
			chara.container.x = pointer.x;
			chara.container.y = pointer.y;
		});
	});
}


export const renderItems = (
	scene: Phaser.Scene,
	parent: Container,
	state: State,
	sellImage: Phaser.GameObjects.Image
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
				dropItemInChara(targetChara, icon, item, () => render(scene, parent));
				return;
			}
			if (Phaser.Geom.Intersects.RectangleToRectangle(
				icon.getBounds(),
				sellImage.getBounds()
			)) {
				handleSelling(icon, state, item, () => render(scene, parent));
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


function handleSelling(icon: Phaser.GameObjects.Image, state: State, item: Item, onSell: () => void) {

	icon.destroy();

	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);
	onSell();

	coinDropIO(item.cost / 2, item.cost / 2, icon.x, icon.y)
}

function handleUnitSell(chara: Chara) {
	const state = getState();
	const unit = chara.unit;
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);

	const benchIndex = state.gameData.player.bench.findIndex(b => b.unit && b.unit.id === unit.id);
	if (benchIndex !== -1) {
		state.gameData.player.bench[benchIndex] = { index: benchIndex, unit: null };
	}

	chara.container.destroy();
	coinDropIO(10, 10, chara.container.x, chara.container.y);

	updatePlayerGoldIO(10);
}

function dropItemInChara(targetChara: Chara, icon: Phaser.GameObjects.Image, item: Item, onDrop: () => void) {

	const state = getState();

	icon.destroy();

	const currentItem = targetChara.unit.equip;

	equipItemInUnit({ unit: targetChara.unit, item });

	// propagate to guild unit
	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);

	if (currentItem !== null) {
		state.gameData.player.items.push(currentItem);
	}

	onDrop();
}