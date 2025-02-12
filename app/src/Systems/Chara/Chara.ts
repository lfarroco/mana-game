import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { emit, listeners, signals } from "../../Models/Signals";
import { Vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { TURN_DURATION } from "../../config";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Image,
	shadow: Phaser.GameObjects.Image,
	unit: Unit,
	container: Phaser.GameObjects.Container,
	hightlightTween: Phaser.Tweens.Tween | null,
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

	container.setDepth(unit.position.y);

	const sprite = scene
		.add.image(
			0, 0,
			unit.job
		)

	sprite.setDisplaySize(spriteSize, spriteSize)

	const shadow = scene.add.image(
		0, 0,
		unit.job)
		.setTint(0x000000)
		.setAlpha(1)
		.setDisplaySize(shadowSize, shadowSize);
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
		unit,
		hightlightTween: null,
	}

	return chara
}

export function CharaSystem_init(scene: BattlegroundScene) {
	listeners([
		[signals.BATTLEGROUND_TICK, () => {
			scene.charas.forEach((chara) => {
				chara.sprite.alpha = 1;
			})
		}],
		[signals.UNIT_SELECTED, (unitId: string) => {

			const chara = scene.getChara(unitId);

			chara.shadow.visible = true;

		}],
		[signals.UNIT_DESELECTED, (unitId: string) => {

			const chara = scene.getChara(unitId);

			chara.shadow.visible = false;

		}],
		[signals.HIGHLIGHT_UNIT, (unitId: string, color: number) => {

			const chara = scene.getChara(unitId);

			chara.sprite.setTint(color);
			chara.hightlightTween = scene.add.tween({
				targets: chara.sprite,
				alpha: 0.7,
				duration: 400 / scene.state.options.speed,
				ease: "Linear",
				repeat: -1,
				yoyo: true,
			});

		}],
		[signals.STOP_HIGHLIGHT_UNIT, (unitId: string) => {

			const chara = scene.getChara(unitId);

			chara.sprite.clearTint();
			chara.hightlightTween?.destroy();
			chara.hightlightTween = null;

		}],

		[signals.MOVE_UNIT_INTO_CELL_START, async (unitId: string, cell: Vec2) => {
			// get the angle of the move
			const chara = scene.getChara(unitId);
			const angle = Phaser.Math.Angle.Between(
				chara.unit.position.x,
				chara.unit.position.y,
				cell.x,
				cell.y
			)
			console.log("... ", angle);
			// if moving left, flip the sprite

			if (angle > -Math.PI / 4 && angle < Math.PI / 4) {
				chara.sprite.setFlipX(false);
			} else {
				chara.sprite.setFlipX(true);
			}
		}],
		[signals.MOVE_UNIT_INTO_CELL_START, async (unitId: string, cell: Vec2) => {

			const chara = scene.getChara(unitId);

			const nextTile = scene.getTileAt(cell);

			await tween(scene, {
				targets: chara.container,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * scene.state.options.speed),
				ease: "Sine.easeInOut",
			})

			emit(signals.MOVE_UNIT_INTO_CELL_FINISH, unitId, cell);
		}],

	])

}