import { State } from "../../../Models/State";
import { createCard, addTooltip, Chara } from "../../../Systems/Chara/Chara";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { render } from "./Guild";
import { handleUnitDrop } from "./GuildDragHandlers";
import { getBenchSlotPosition, getBenchCardPosition } from "./GuildRenderHelpers";
import { overlapsWithPlayerBoard } from "../../../Models/Board";
import { destroyChara } from "./CharaManager";

const guildBenchState = {
	benchCharas: [] as Chara[],
};

export function renderBench(
	scene: Phaser.Scene,
	parent: Container,
	state: State,
) {

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
		const slot = scene.add.image(x, y, "ui/slot").setDisplaySize(w, h).setOrigin(0);
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
			const result = handleUnitDrop({
				chara,
				pointer,
				scene,
				parent,
				render,
				overlapsWithPlayerBoard,
				slotIndex: index,
				guildBenchState
			});
			if (result === "sell") {
				scene.events.emit("unitSell", chara);
				render(scene, parent);
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
