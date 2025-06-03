import { createCard, addTooltip, Chara } from "../../../Systems/Chara/Chara";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { render } from "./Guild";
import { handleUnitDrop } from "./GuildDragHandlers";
import { getBenchSlotPosition, getBenchCardPosition } from "./GuildRenderHelpers";
import { destroyChara, summonChara } from "./CharaManager";
import { getState } from "../../../Models/State";
import { getTileAt } from "../../../Models/Board";
import { eqVec2, vec2 } from "../../../Models/Geometry";
import { displayError } from "./UIManager";
import { tween } from "../../../Utils/animation";
import { images } from "../../../assets";

const guildBenchState = {
	benchCharas: [] as Chara[],
};

export function renderBench(
	scene: Scene,
	parent: Container,
) {
	const state = getState();

	guildBenchState.benchCharas.forEach(chara => {
		destroyChara(chara.id);
	});
	guildBenchState.benchCharas = [];

	const benchTitle = scene.add.text(
		50,
		80,
		"Bench",
		constants.titleTextConfig);
	parent.add(benchTitle);

	// Use the bench array directly (already { index, unit })
	const benchSlots = state.gameData.player.bench;

	const imageSlots = benchSlots.map(({ index }) => {
		const { x, y } = getBenchSlotPosition(index);
		const w = constants.TILE_WIDTH + 20;
		const h = constants.TILE_HEIGHT + 20;
		const slot = scene.add.image(x, y,
			images.slot.key,
		).setDisplaySize(w, h).setOrigin(0);
		const zone = scene.add.zone(x, y, w, h)
			.setPosition(x, y)
			.setName("slot")
			.setDataEnabled()
			.setData("slot", index)
			.setOrigin(0)
			.setRectangleDropZone(w, h);
		parent.add([slot, zone]);
		if (!state.options.debug) return slot;
		const dropZoneDisplay = scene.add.graphics();
		dropZoneDisplay.lineStyle(2, 0xffff00);
		dropZoneDisplay.fillStyle(0x00ffff, 0.3);
		dropZoneDisplay.fillRect(x, y, w, h);
		dropZoneDisplay.strokeRect(x, y, w, h);
		parent.add([dropZoneDisplay]);
		return slot;
	});

	benchSlots.forEach(({ index, unit }) => {
		if (!unit) return;
		const chara = createCard(unit);
		guildBenchState.benchCharas.push(chara);
		const { x, y } = getBenchCardPosition(index);
		chara.container.setPosition(x, y);
		chara.zone.setInteractive({ draggable: true });
		addTooltip(chara);
		parent.add(chara.container);
		chara.zone.on("dragstart", () => {
			parent.bringToTop(chara.container);
			Tooltip.hide();
		});
		chara.zone.on('dragend', (pointer: Phaser.Input.Pointer) => {
			const result = handleUnitDrop(
				chara,
				pointer,
			);
			if (result === "sell") {
				scene.events.emit("unitSell", chara);
				render(scene, parent);
				return;
			}
			if (result === "noop") {
				return;
			}
			if (result === "dropped-in-board") {
				handleCharaDroppedInBoard(scene, chara, parent, pointer, index);
				render(scene, parent);
				return;
			}
			if (result === "not-bench-or-board") {
				returnToPosition(chara, index);
				return;
			}
			if (result?.type === "benchSlot") {
				const fromIdx = index;
				const toIdx = result.index;
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

	return imageSlots;
}

function handleCharaDroppedInBoard(
	scene: Scene,
	chara: Chara,
	parent: Container,
	pointer: Pointer,
	slotIndex: number,
) {
	// drop in board
	const state = getState();
	state.gameData.player.units.forEach((unit) => {
		unit.events.onLeavePosition.forEach((fn) => fn(unit)());
	});

	const tile = getTileAt(pointer)!;
	// Use the correct Vec2 type from Models/Geometry
	const position = vec2(tile.x, tile.y)!;
	const maybeOccupier = state.gameData.player.units.find((u) => eqVec2(u.position, position));

	// Unit came from bench, so this will exist
	const sourceBenchSlot = state.gameData.player.bench.find((b: any) => b && b.unit && b.unit.id === chara.unit.id)!;

	if (maybeOccupier) {
		destroyChara(maybeOccupier.id);
		state.gameData.player.units = state.gameData.player.units.filter((u) => u.id !== maybeOccupier.id);
		sourceBenchSlot.unit = maybeOccupier;
	} else {
		if (state.gameData.player.units.length < constants.MAX_PARTY_SIZE) {
			sourceBenchSlot.unit = null;
		} else {
			displayError(`You can only have ${constants.MAX_PARTY_SIZE} units in your party.`);
			returnToPosition(chara, slotIndex);
			return;
		}
	}

	const unit = chara.unit;
	unit.position = position;
	state.gameData.player.units.push(unit);
	state.battleData.units.push(unit);

	guildBenchState.benchCharas = guildBenchState.benchCharas.filter((b) => b.unit.id !== chara.unit.id);
	destroyChara(chara.unit.id);
	summonChara(unit, true);

	state.gameData.player.units.forEach((unit) => {
		unit.events.onEnterPosition.forEach((fn) => fn(unit)());
	});
	render(scene, parent);
}

function returnToPosition(chara: Chara, slotIndex: number) {
	const pos = getBenchCardPosition(slotIndex);
	tween({
		targets: [chara.container],
		...pos,
	});
}