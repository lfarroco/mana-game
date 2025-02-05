import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { emit, listeners, signals } from "../../Models/Signals";
import { Vec2 } from "../../Models/Geometry";
import { getSkill } from "../../Models/Skill";
import { FORCE_ID_PLAYER } from "../../Models/Force";

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

function highlightTarget(chara: Chara, skillId: string, targetId: string) {

	const unit = chara.unit;

	if (unit.force !== FORCE_ID_PLAYER) return;

	const target = (chara.sprite.scene as BattlegroundScene).getChara(targetId);

	const skill = getSkill(skillId)

	const color = skill.harmful ? 0xff0000 : 0x00ff00;

	emit(signals.HIGHLIGHT_UNIT, target.id, color);
}

function cancelTargetHighlight(chara: Chara) {

	if (chara.unit.order.type !== "skill-on-unit") return;

	const target = chara.unit.order.target;
	emit(signals.STOP_HIGHLIGHT_UNIT, target);
}

export function CharaSystem_init(scene: BattlegroundScene) {
	listeners([
		[signals.BATTLEGROUND_TICK, () => {
			scene.charas.forEach((chara) => {
				cancelTargetHighlight(chara);
				chara.sprite.alpha = 1;
			})
		}],
		[signals.UNIT_SELECTED, (unitId: string) => {

			const chara = scene.getChara(unitId);

			chara.shadow.visible = true;

			if (chara.unit.order.type === "skill-on-unit")
				highlightTarget(chara, chara.unit.order.skill, chara.unit.order.target);

		}],
		[signals.UNIT_DESELECTED, (unitId: string) => {

			const chara = scene.getChara(unitId);

			chara.shadow.visible = false;

			cancelTargetHighlight(chara);

		}],
		[signals.SELECT_SKILL_TARGET_DONE, (casterId: string, skillId: string, tile: Vec2, targetId: string | null) => {

			const chara = scene.getChara(casterId);

			cancelTargetHighlight(chara);

			if (targetId) {
				highlightTarget(chara, skillId, targetId)

				chara.unit.order = {
					type: "skill-on-unit",
					skill: skillId,
					target: targetId
				}
			}

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
		[signals.SELECT_UNIT_MOVE_DONE, (unitIds: string[], target: Vec2) => {

			unitIds.forEach((unitId) => {
				const chara = scene.getChara(unitId);

				cancelTargetHighlight(chara);

				chara.container.setDepth(target.y);
			});

		}],

	])

}