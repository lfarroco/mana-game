import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { emit, listeners, signals } from "../../Models/Signals";
import { Vec2 } from "../../Models/Geometry";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Image,
	shadow: Phaser.GameObjects.Image,
	unit: Unit,
	container: Phaser.GameObjects.Container
}

const spriteSize = 64;
const shadowSize = 74;

export const CHARA_SCALE = 1;

export function createChara(
	scene: BattlegroundScene,
	unit: Unit,
): Chara {

	const container = scene.add.container(
		unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
		unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT
	)

	const sprite = scene
		.add.image(
			0, 0,
			unit.job
		).setName("chara-" + unit.id);// TODO: is this being used?

	sprite.setDisplaySize(spriteSize, spriteSize)

	const shadow = scene.add.image(
		0, 0,
		unit.job
	).setName("shadow-" + unit.id).setTint(0x000000).setAlpha(1).setDisplaySize(shadowSize, shadowSize);
	shadow.visible = false;

	scene.children.moveBelow(shadow, sprite);

	// TODO: move to animation system
	//sprite.play(unit.job + "-idle-down", true);

	container.add([shadow, sprite])

	const chara: Chara = {
		id: unit.id,
		force: unit.force,
		job: unit.job,
		sprite,
		container,
		shadow,
		unit
	}
	listeners([
		[signals.UNIT_SELECTED, (unitId: string) => {

			if (unitId !== chara.id) return;
			shadow.visible = true;

			highlightTarget(chara);

		}],
		[signals.UNIT_DESELECTED, (unitId: string) => {
			if (unitId !== chara.id) return;
			shadow.visible = false;

			emit(signals.STOP_HIGHLIGHT_UNIT, chara.id);
			cancelTargetHighlight(chara);

		}],
		[signals.SELECT_SKILL_TARGET_DONE, (tile: Vec2, unitId: string | null) => {

			if (unitId !== chara.id) return;

			const color = unit.force === "player" ? 0x00ff00 : 0xff0000;

			scene.add.tween({
				targets: sprite,
				alpha: 0,
				tint: color,
				duration: 100 / scene.state.options.speed,
				ease: "Linear",
				repeat: 3,
				yoyo: true,
				onComplete: () => {
					emit(signals.HIGHLIGHT_UNIT, chara.id, color)
				}
			})
		}],
		[signals.HIGHLIGHT_UNIT, (unitId: string, color: number) => {

			if (unitId !== chara.id) return;

			sprite.setTint(color);

		}],
		[signals.STOP_HIGHLIGHT_UNIT, (unitId: string) => {

			if (unitId !== chara.id) return;

			sprite.clearTint();

		}],
		[signals.SELECT_UNIT_MOVE_DONE, (unitIds: string[], target: Vec2) => {

			unitIds.forEach((unitId) => {
				const chara = scene.getChara(unitId);

				cancelTargetHighlight(chara);
			});

		}],

	])

	return chara
}

function highlightTarget(chara: Chara) {

	const unit = chara.unit;

	if (unit.order.type !== "skill-on-unit") return

	const target = (chara.sprite.scene as BattlegroundScene).getChara(unit.order.target);

	emit(signals.HIGHLIGHT_UNIT, target.id, 0xff0000);
}

function cancelTargetHighlight(chara: Chara) {

	const unit = chara.unit;

	if (unit.order.type !== "skill-on-unit") return

	const target = (chara.sprite.scene as BattlegroundScene).getChara(unit.order.target);

	emit(signals.STOP_HIGHLIGHT_UNIT, target.id);
}
