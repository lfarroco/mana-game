import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { emit, listeners, signals } from "../../Models/Signals";
import { eqVec2, vec2, Vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { TURN_DURATION } from "../../config";
import { FORCE_ID_PLAYER } from "../../Models/Force";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Image,
	scene: BattlegroundScene,
	unit: Unit,
	container: Phaser.GameObjects.Container,
	hightlightTween: Phaser.Tweens.Tween | null,
}

const spriteSize = TILE_WIDTH - 4;

export const CHARA_SCALE = 1;

export function createChara(
	scene: BattlegroundScene,
	unit: Unit,
): Chara {

	const container = scene.add.container(
		unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
		unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT
	)

	const borderColor = unit.force === FORCE_ID_PLAYER ? 0x1818d1 : 0xfa0f0f;

	const border = scene.add.rectangle(
		0, 0,
		spriteSize + 4, spriteSize + 4,
		borderColor, 1)
		.setOrigin(0.5, 0.5)

	const sprite = scene
		.add.image(
			0, 0,
			unit.job + "/portrait"
		)

	sprite.setDisplaySize(spriteSize, spriteSize)


	// TODO: move to animation system
	//sprite.play(unit.job + "-idle-down", true);

	container.add([border, sprite])

	const chara: Chara = {
		id: unit.id,
		force: unit.force,
		job: unit.job,
		scene,
		sprite,
		container,
		unit,
		hightlightTween: null,
	}

	makeCharaInteractive(chara);

	return chara
}
export const makeCharaInteractive = (chara: Chara) => {

	const { scene } = chara;

	chara.sprite.setInteractive({ draggable: true });

	chara.sprite.on('drag', (pointer: Phaser.Input.Pointer) => {
		chara.container.x = pointer.x;
		chara.container.y = pointer.y;
	});

	chara.sprite.on('drop', (
		pointer: Phaser.Input.Pointer,
		zone: Phaser.GameObjects.GameObject,
	) => {

		if (zone.name.startsWith("bench-slot-")) {

			scene.state.gameData.units = scene.state.gameData.units.filter(u => u.id !== chara.unit.id);
			scene.bench.push(chara.unit);

			chara.container.destroy();
			scene.charas = scene.charas.filter(c => c.id !== chara.id);

			scene.renderBench();
			return;

		}

		const tile = scene.getTileAtWorldXY(vec2(pointer.worldX, pointer.worldY));

		const position = vec2(tile.x, tile.y)

		const maybeOccupier = scene.state.gameData.units.find(u => eqVec2(u.position, position));

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

	});

	chara.sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {

		// check if the drag ended inside or outside scene.dropZone

		if (!scene.dropZone?.getBounds().contains(pointer.x, pointer.y)) {
			tween({
				targets: [chara.container],
				duration: 500,
				ease: 'Power2',
				x: chara.unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
				y: chara.unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
			})
		}


	})


}

export function CharaSystem_init(scene: BattlegroundScene) {
	listeners([
		[signals.BATTLEGROUND_TICK, () => {
			scene.charas.forEach((chara) => {
				chara.sprite.alpha = 1;
			})
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

			const chara = scene.getChara(unitId);

			const nextTile = scene.getTileAt(cell);

			await tween({
				targets: [chara.container],
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * scene.state.options.speed),
				ease: "Sine.easeInOut",
			})

			emit(signals.MOVE_UNIT_INTO_CELL_FINISH, unitId, cell);
		}],

	])

}