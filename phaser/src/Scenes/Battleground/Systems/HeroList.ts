import { playerForce } from "../../../Models/Force";
import { eqVec2, vec2 } from "../../../Models/Geometry";
import { jobs } from "../../../Models/Job";
import { getState } from "../../../Models/State";
import { makeUnit } from "../../../Models/Unit";
import { addTooltip, createCard } from "../../../Systems/Chara/Chara";
import * as Flyout_ from "../../../Systems/Flyout";
import * as Tooltip from "../../../Systems/Tooltip";
import * as constants from "../constants";
import { getTileAt } from "./GridSystem";
import { destroyChara, summonChara } from "./UnitManager";

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

	//const state = getState();

	let page = 0;

	const update = () => {

		parent.removeAll(true);

		jobs.slice(page * 15, (page + 1) * 15)
			.forEach((job, index) => {

				const chara = createCard({
					...makeUnit(playerForce.id, job.id)
				});

				const x = 160 + (index % 3) * constants.TILE_WIDTH + ((index % 3) * 20);
				const y = 220 + Math.floor(index / 5) * constants.TILE_HEIGHT + ((Math.floor(index / 5) * 20));

				chara.container.setPosition(x, y);

				chara.zone.setInteractive({ draggable: true });

				addTooltip(chara);

				parent.add(chara.container);

				chara.zone.on("dragstart", () => {
					Tooltip.hide();
				});

				chara.zone.on('drop', (
					pointer: Phaser.Input.Pointer,
					zone: Phaser.GameObjects.GameObject,
				) => {

					if (zone.name !== "board") return;

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

		const nextPage = scene.add.image(400, 900, "ui/button")
			.setOrigin(0)
			.setDisplaySize(100, 100)
			.setInteractive()
			.setAlpha(page < Math.ceil(jobs.length / 15) - 1 ? 1 : 0.5)
			.on("pointerup", () => {
				if (page >= Math.ceil(jobs.length / 15) - 1) return;
				page++;
				if (page >= Math.ceil(jobs.length / 15)) {
					page = 0;
				}
				update();
			});
		const prevPage = scene.add.image(100, 900, "ui/button")
			.setOrigin(0)
			.setDisplaySize(100, 100)
			.setInteractive()
			.setAlpha(page > 0 ? 1 : 0.5)
			.on("pointerup", () => {
				if (page === 0) return;

				page--;
				if (page < 0) {
					page = Math.ceil(jobs.length / 15) - 1;
				}
				update();
			});

		parent.add([nextPage, prevPage]);
	}

	update();

}
