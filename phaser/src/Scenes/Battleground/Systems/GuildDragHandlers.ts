// Drag-and-drop handlers for Guild UI
import { getState } from "../../../Models/State";
import { destroyChara, summonChara } from "./CharaManager";
import { displayError } from "./UIManager";
import * as constants from "../constants";
import { tween } from "../../../Utils/animation";
import { eqVec2, vec2 } from "../../../Models/Geometry";
import { getBenchCardPosition, getBenchSlotPosition } from "./GuildRenderHelpers";

export function handleUnitDrop({
	chara,
	pointer,
	scene,
	parent,
	sellImage,
	render,
	getTileAt,
	overlapsWithPlayerBoard,
	slotIndex
}: any) {
	const returnToPosition = () => {

		const pos = getBenchCardPosition(slotIndex);
		tween({
			targets: [chara.container],
			...pos
		});
	};

	const wasDrag = pointer.getDistance() > 10;
	const inBoard = overlapsWithPlayerBoard(pointer);

	if (wasDrag && Phaser.Geom.Intersects.RectangleToRectangle(
		chara.container.getBounds(),
		sellImage.getBounds()
	)) {
		return "sell";
	}
	const dropBenchSlot = [0, 1, 2].find((slotIdx) => {
		const { x: slotX, y: slotY } = getBenchSlotPosition(slotIdx);
		const w = constants.TILE_WIDTH + 20;
		const h = constants.TILE_HEIGHT + 20;
		return (
			pointer.x >= slotX && pointer.x <= slotX + w &&
			pointer.y >= slotY && pointer.y <= slotY + h
		);
	});
	if (wasDrag && dropBenchSlot !== undefined) {
		return { type: "benchSlot", index: dropBenchSlot };
	}

	if (wasDrag && !inBoard) {
		returnToPosition();
		return;
	}

	// drop in board

	const state = getState();
	state.gameData.player.units.forEach((unit: any) => {
		unit.events.onLeavePosition.forEach((fn: any) => fn(unit)());
	});

	const tile = getTileAt(pointer)!;
	const position = vec2(tile.x, tile.y)!;
	const maybeOccupier = state.gameData.player.units.find((u: any) => eqVec2(u.position, position));

	// Unit came from bench, so this will exist
	const sourceBenchSlot = state.gameData.player.bench.find((b: any) => b && b.unit && b.unit.id === chara.unit.id)!;

	if (maybeOccupier) {
		destroyChara(maybeOccupier.id);
		state.gameData.player.units = state.gameData.player.units.filter((u: any) => u.id !== maybeOccupier.id);
		sourceBenchSlot.unit = maybeOccupier;
	} else {

		if (state.gameData.player.units.length < constants.MAX_PARTY_SIZE) {
			sourceBenchSlot.unit = null;
		} else {
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
	state.gameData.player.units.forEach((unit: any) => {
		unit.events.onEnterPosition.forEach((fn: any) => fn(unit)());
	});
	render(scene, parent);
}
