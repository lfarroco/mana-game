// Drag-and-drop handlers for Guild UI
import { getState } from "../../../Models/State";
import { destroyChara, summonChara } from "./CharaManager";
import { displayError } from "./UIManager";
import * as constants from "../constants";
import { tween } from "../../../Utils/animation";
import { eqVec2, vec2 } from "../../../Models/Geometry";
import { getBenchCardPosition, getBenchSlotPosition } from "./GuildRenderHelpers";
import { Unit } from "../../../Models/Unit";
import { Chara } from "../../../Systems/Chara/Chara";
import { sellImage } from "./Guild";
import { getTileAt } from "./GridSystem";

// --- Type Definitions ---

interface GuildBenchState {
	benchCharas: { unit: Unit }[];
}
interface HandleUnitDropParams {
	chara: Chara;
	pointer: Pointer;
	scene: Phaser.Scene;
	parent: Container;
	render: (scene: Scene, parent: Container) => void;
	overlapsWithPlayerBoard: (pointer: Pointer) => boolean;
	slotIndex: number;
	guildBenchState: GuildBenchState;
}

function returnToPosition(chara: Chara, slotIndex: number) {
	const pos = getBenchCardPosition(slotIndex);
	tween({
		targets: [chara.container],
		...pos,
	});
}

function handleSell(chara: Chara, pointer: Pointer): boolean {
	return (
		pointer.getDistance() > 10 &&
		Phaser.Geom.Intersects.RectangleToRectangle(
			chara.container.getBounds(),
			sellImage!.getBounds()
		)
	);
}

function getDropBenchSlot(pointer: Pointer): number | undefined {
	return [0, 1, 2].find((slotIdx) => {
		const { x: slotX, y: slotY } = getBenchSlotPosition(slotIdx);
		const w = constants.TILE_WIDTH + 20;
		const h = constants.TILE_HEIGHT + 20;
		return (
			pointer.x >= slotX && pointer.x <= slotX + w &&
			pointer.y >= slotY && pointer.y <= slotY + h
		);
	});
}

export function handleUnitDrop({
	chara,
	pointer,
	scene,
	parent,
	render,
	overlapsWithPlayerBoard,
	slotIndex,
	guildBenchState,
}: HandleUnitDropParams): void | { type: "benchSlot"; index: number } | "sell" {
	const wasDrag = pointer.getDistance() > 10;
	const inBoard = overlapsWithPlayerBoard(pointer);

	if (handleSell(chara, pointer)) {
		return "sell";
	}

	const dropBenchSlot = getDropBenchSlot(pointer);
	if (wasDrag && dropBenchSlot !== undefined) {
		return { type: "benchSlot", index: dropBenchSlot };
	}

	if (wasDrag && !inBoard) {
		returnToPosition(chara, slotIndex);
		return;
	}

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
