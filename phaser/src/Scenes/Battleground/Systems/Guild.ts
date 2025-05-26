import { eqVec2, vec2 } from "../../../Models/Geometry";
import { getState, State } from "../../../Models/State";
import { addTooltip, Chara, createCard } from "../../../Systems/Chara/Chara";
import * as Flyout_ from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { getTileAt } from "./GridSystem";
import { destroyChara, overlap, summonChara } from "./UnitManager";
import { coinDropIO, displayError } from "./UIManager";
import { tween } from "../../../Utils/animation";
import { overlapsWithPlayerBoard } from "../../../Models/Board";
import { Item } from "../../../Models/Item";
import { equipItemInUnit } from "../../../Systems/Item/EquipItem";
import { Unit } from "../../../Models/Unit";
import { updatePlayerGoldIO } from "../../../Models/Force";

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

	const occupier = state.gameData.player.bench[index];

	if (occupier) {
		occupier.position = unit.position;
		state.gameData.player.units.push(occupier);
		summonChara(occupier, true);
	}

	state.gameData.player.bench[index] = unit;
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

	for (let i = 0; i < constants.MAX_BENCH_SIZE; i++) {

		const x = 60 + (i % 3) * constants.TILE_WIDTH + ((i % 3) * 20);
		const y = 150 + Math.floor(i / 5) * constants.TILE_HEIGHT + ((Math.floor(i / 5) * 20));

		const w = constants.TILE_WIDTH + 20;
		const h = constants.TILE_HEIGHT + 20;

		const slot = scene.add.image(
			x, y,
			"ui/slot"
		).setDisplaySize(w, h).setOrigin(0);
		//create a drop zone for the slot
		const zone = scene.add.zone(x, y, w, h)
			.setPosition(x, y)
			.setName("slot")
			.setDataEnabled()
			.setData("slot", i)
			.setOrigin(0)
			.setRectangleDropZone(w, h);



		parent.add([slot, zone]);

		if (!state.options.debug) continue;

		const dropZoneDisplay = scene.add.graphics();
		dropZoneDisplay.lineStyle(2, 0xffff00);
		dropZoneDisplay.fillStyle(0x00ffff, 0.3);
		dropZoneDisplay.fillRect(
			x, y,
			w, h
		);
		dropZoneDisplay.strokeRect(
			x, y,
			w, h
		);

		parent.add([dropZoneDisplay]);
	}

	state.gameData.player.bench
		.forEach((unit, index) => {

			if (!unit) return;

			const chara = createCard(unit);

			const x = 160 + (index % 3) * constants.TILE_WIDTH + ((index % 3) * 20) + 30;
			const y = 250 + Math.floor(index / 5) * constants.TILE_HEIGHT + ((Math.floor(index / 5) * 20)) + 30;

			chara.container.setPosition(x, y);

			chara.zone.setInteractive({ draggable: true });

			addTooltip(chara);

			parent.add(chara.container);

			const returnToPosition = () => {
				tween({
					targets: [chara.container],
					x,
					y
				});
			};

			chara.zone.on("dragstart", () => {
				Tooltip.hide();
			});

			chara.zone.on('dragend', (
				pointer: Phaser.Input.Pointer
			) => {

				const wasDrag = pointer.getDistance() > 10;
				const inBoard = overlapsWithPlayerBoard(pointer);

				if (wasDrag && Phaser.Geom.Intersects.RectangleToRectangle(
					chara.container.getBounds(),
					sellImage.getBounds()
				)) {
					handleUnitSell(chara);
					return;
				}

				if (wasDrag && !inBoard) {
					returnToPosition();
					return;
				}

				const state = getState();

				// The board will change: remove position bonuses for all units
				state.gameData.player.units.forEach((unit) => {
					unit.events.onLeavePosition.forEach(fn => fn(unit)());
				});

				const tile = getTileAt(pointer)!;

				const position = vec2(tile.x, tile.y)!;

				const maybeOccupier = state.gameData.player.units.find(u => eqVec2(u.position, position));

				const benchIndex = state.gameData.player.bench.findIndex(u => u?.id === chara.id);
				if (maybeOccupier) {

					destroyChara(maybeOccupier.id);
					state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== maybeOccupier.id);
					state.gameData.player.bench[benchIndex] = maybeOccupier;

				} else {

					state.gameData.player.bench[benchIndex] = null;

					if (state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
						displayError(`You can only have ${constants.MAX_PARTY_SIZE} units in your party.`);
						returnToPosition();
						return;
					}
				}

				const unit = chara.unit;
				unit.position = position;
				state.gameData.player.units.push(unit);
				state.battleData.units.push(unit);

				chara.container.destroy();

				summonChara(unit, true);

				// The board has changed: calculate position bonuses for all units
				state.gameData.player.units.forEach((unit) => {
					unit.events.onEnterPosition.forEach(fn => fn(unit)());
				});

				render(scene, parent);

			});

			chara.zone.on("drag", (pointer: Phaser.Input.Pointer) => {
				chara.container.x = pointer.x;
				chara.container.y = pointer.y;
			});

		});
}


export const renderItems = async (
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

	const slots = new Array(gridWidth * gridHeight)
		.fill(0)
		.map((_, index) => {

			const x = index % gridWidth;
			const y = Math.floor(index / gridWidth);
			const w = CHEST_TILE_SIZE + spacing;
			const h = CHEST_TILE_SIZE + spacing;
			const position: [number, number] = [
				baseX + (x * CHEST_TILE_SIZE) + (x * spacing),
				baseY + (y * CHEST_TILE_SIZE) + (y * spacing)
			];

			const slot = scene.add.image(0, 0, "ui/slot")
				.setOrigin(0.5)
				.setDisplaySize(w, h)
				.setPosition(...position);



			parent.add([slot]);

			slot.setInteractive({ useHandCursor: true });
			slot.on("dragover", (pointer: Phaser.Input.Pointer) => {
				if (Phaser.Geom.Intersects.RectangleToRectangle(
					new Phaser.Geom.Rectangle(pointer.x, pointer.y, 1, 1),
					slot.getBounds()
				)) {
					slot.setTint(0x00ff00);
				}
			});

			const item = state.gameData.player.items[index];

			if (!item) {
				return slot;
			}
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

				// check if dropped over another item
				const targetSlot = slots.find(slot => Phaser.Geom.Intersects.RectangleToRectangle(
					new Phaser.Geom.Rectangle(pointer.x, pointer.y, 1, 1),
					slot.getBounds()
				));

				if (targetSlot) {
					// move item to slot
					// if the slot is not empty, switch

					parent.bringToTop(icon);

					const targetIndex = slots.indexOf(targetSlot);
					const targetItem = state.gameData.player.items[targetIndex];
					if (targetItem) {
						// swap items in state, update ches

						state.gameData.player.items[index] = targetItem;
						state.gameData.player.items[targetIndex] = item;

						render(scene, parent);

						return;
					}

					// move item to slot

					state.gameData.player.items[index] = null;
					state.gameData.player.items[targetIndex] = item;

					// update chest
					render(scene, parent);

				}

				// nothing happened, return to original position
				icon.setPosition(...position);
				return;

			});

			return slot

		});
}

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

	const benchIndex = state.gameData.player.bench.findIndex(u => u?.id === unit.id);
	if (benchIndex !== -1) {
		state.gameData.player.bench[benchIndex] = null;
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