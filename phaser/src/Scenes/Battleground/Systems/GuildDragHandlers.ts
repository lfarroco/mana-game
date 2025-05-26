// Drag-and-drop handlers for Guild UI
import { getState } from "../../../Models/State";
import { destroyChara, summonChara } from "./UnitManager";
import { displayError } from "./UIManager";
import * as constants from "../constants";
import { tween } from "../../../Utils/animation";
import { eqVec2, vec2 } from "../../../Models/Geometry";

export function handleUnitDrop({
	chara,
	pointer,
	scene,
	parent,
	sellImage,
	render,
	getTileAt,
	overlapsWithPlayerBoard
}: any) {
	const returnToPosition = () => {
		tween({
			targets: [chara.container],
			x: chara.container.x,
			y: chara.container.y
		});
	};

	const wasDrag = pointer.getDistance() > 10;
	const inBoard = overlapsWithPlayerBoard(pointer);

	if (wasDrag && Phaser.Geom.Intersects.RectangleToRectangle(
		chara.container.getBounds(),
		sellImage.getBounds()
	)) {
		// handleUnitSell is still in Guild.ts
		return "sell";
	}

	if (wasDrag && !inBoard) {
		returnToPosition();
		return;
	}

	const state = getState();
	state.gameData.player.units.forEach((unit: any) => {
		unit.events.onLeavePosition.forEach((fn: any) => fn(unit)());
	});

	const tile = getTileAt(pointer)!;
	const position = vec2(tile.x, tile.y)!;
	const maybeOccupier = state.gameData.player.units.find((u: any) => eqVec2(u.position, position));
	const benchIndex = state.gameData.player.bench.findIndex((u: any) => u?.id === chara.id);

	if (maybeOccupier) {
		destroyChara(maybeOccupier.id);
		state.gameData.player.units = state.gameData.player.units.filter((u: any) => u.id !== maybeOccupier.id);
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
	state.gameData.player.units.forEach((unit: any) => {
		unit.events.onEnterPosition.forEach((fn: any) => fn(unit)());
	});
	render(scene, parent);
}
