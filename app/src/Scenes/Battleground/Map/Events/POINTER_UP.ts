import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { Unit } from "../../../../Models/Unit";
import { eqVec2, vec2 } from "../../../../Models/Geometry";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../constants";
import { tween } from "../../../../Utils/animation";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	scene: BattlegroundScene,
	unitPointerDown: { unit: Unit | null }
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer) => {

			const state = getState();

			if (state.inputDisabled) {
				console.log("input disabled, exit POINTER_UP event");
				return;
			}

			if (pointer.downElement !== scene.game.canvas) {
				console.log("down element is not canvas, exit POINTER_UP event");
				return;
			}

			if (unitPointerDown.unit) {

				const tile = scene.getTileAtWorldXY(vec2(pointer.worldX, pointer.worldY));

				const chara = scene.getChara(unitPointerDown.unit.id);

				const position = vec2(tile.x, tile.y)

				const maybeOccupier = state.gameData.units.find(u => eqVec2(u.position, position));

				if (maybeOccupier) {
					const occupierChara = scene.getChara(maybeOccupier.id);

					maybeOccupier.position = chara.unit.position;

					tween({
						targets: [occupierChara.container],
						duration: 500,
						ease: 'Power2',
						x: maybeOccupier.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
						y: maybeOccupier.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
					})
				}

				chara.unit.position = position;

				tween({
					targets: [chara.container],
					duration: 500,
					ease: 'Power2',
					x: position.x * TILE_WIDTH + HALF_TILE_WIDTH,
					y: position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
				})
			}

			unitPointerDown.unit = null;

		}
	);
}
