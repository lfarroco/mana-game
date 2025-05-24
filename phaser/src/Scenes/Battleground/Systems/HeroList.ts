import { eqVec2, vec2 } from "../../../Models/Geometry";
import { getState } from "../../../Models/State";
import { addTooltip, createCard } from "../../../Systems/Chara/Chara";
import * as Flyout_ from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { getTileAt } from "./GridSystem";
import { destroyChara, summonChara } from "./UnitManager";
import { displayError } from "./UIManager";
import { tween } from "../../../Utils/animation";
import { overlapsWithPlayerBoard } from "../../../Models/Board";

export async function renderHeroButton(scene: Phaser.Scene) {

	const flyout = await Flyout_.create(scene, "Heroes")
	const container = scene.add.container(0, 0);
	flyout.add(container);

	scene.add.image(
		...[
			constants.SCREEN_WIDTH - 120,
			constants.SCREEN_HEIGHT - 560
		],
		"charas/nameless")
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

	await flyout.slideIn();
}

export function render(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {

	parent.removeAll(true);

	const state = getState();

	const update = () => {

		parent.removeAll(true);

		state.gameData.player.bench
			.forEach((unit, index) => {

				const chara = createCard(unit);

				const x = 160 + (index % 3) * constants.TILE_WIDTH + ((index % 3) * 20);
				const y = 220 + Math.floor(index / 5) * constants.TILE_HEIGHT + ((Math.floor(index / 5) * 20));

				chara.container.setPosition(x, y);

				chara.zone.setInteractive({ draggable: true });

				addTooltip(chara);

				parent.add(chara.container);

				const returnToPosition = () => {
					tween({
						targets: [chara.container],
						x,
						y
					})
				}

				chara.zone.on("dragstart", () => {
					Tooltip.hide();
				});

				chara.zone.on('dragend', (
					pointer: Phaser.Input.Pointer,
				) => {

					const wasDrag = pointer.getDistance() > 10;
					const inBoard = overlapsWithPlayerBoard(pointer);

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

					const position = vec2(tile.x, tile.y)!

					const maybeOccupier = state.gameData.player.units.find(u => eqVec2(u.position, position));

					if (maybeOccupier) {

						destroyChara(maybeOccupier.id);

						state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== maybeOccupier.id);
						state.gameData.player.bench = state.gameData.player.bench.filter(u => u.id !== chara.id);
						state.gameData.player.bench.push(maybeOccupier);

						render(scene, parent);

					} else {
						if (state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
							displayError(`You can only have ${constants.MAX_PARTY_SIZE} units in your party.`);
							returnToPosition();
							return;
						}
					}

					const unit = chara.unit;
					unit.position = position;
					state.gameData.player.units.push(unit);

					chara.container.destroy();

					summonChara(unit, true);

					// The board has changed: calculate position bonuses for all units
					state.gameData.player.units.forEach((unit) => {
						unit.events.onEnterPosition.forEach(fn => fn(unit)());
					});

				});

				chara.zone.on("drag", (pointer: Phaser.Input.Pointer) => {
					chara.container.x = pointer.x;
					chara.container.y = pointer.y;
				});

			});
	}

	update();

}
