import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
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

let unitInfoContainer: Phaser.GameObjects.Container | null = null;

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

		// check if it was a click or drag
		if (pointer.getDistance() < 10) {

			displayUnitInfo(chara);

			return;
		}

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

// create a rect with the unit's portrait and stats
// to the right of the sprite
function displayUnitInfo(chara: Chara) {

	unitInfoContainer?.destroy();

	const { scene, unit } = chara;

	const width = 200;
	const height = 200;
	const x = chara.container.x + TILE_WIDTH;
	const y = chara.container.y - TILE_HEIGHT;

	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.8);
	bg.fillRect(0, 0, width, height);

	const name = scene.add.text(10, 10, unit.job, { color: "white" });
	const hp = scene.add.text(10, 50, `HP: ${unit.hp}`, { color: "white" });
	const atk = scene.add.text(10, 90, `ATK: ${unit.attack}`, { color: "white" });

	unitInfoContainer = scene.add.container(x, y);
	unitInfoContainer.add([bg, name, hp, atk]);

	const closeBtn = scene.add.text(width - 20, 10, "X", { color: "white" })
		.setInteractive()
		.on("pointerdown", () => {
			unitInfoContainer?.destroy();
		}
		);

	unitInfoContainer.add(closeBtn);

	const updgradeBtn = scene.add.text(10, 130, "Upgrade", { color: "white" })
		.setInteractive()
		.on("pointerdown", () => {
			upgradeWindow(unitInfoContainer!, chara)
		});

	unitInfoContainer.add(updgradeBtn);

}

function upgradeWindow(
	parent: Phaser.GameObjects.Container,
	chara: Chara,
) {
	// display two rects with two job options 

	const { scene, unit } = chara;

	const width = SCREEN_WIDTH;
	const height = SCREEN_HEIGHT;
	const x = parent.x + width;
	const y = parent.y;


	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.3);
	bg.fillRect(0, 0, width, height);
	bg.setInteractive(
		new Phaser.Geom.Rectangle(0, 0, width, height),
		Phaser.Geom.Rectangle.Contains
	)

	const job1 = scene.add.text(
		SCREEN_WIDTH / 2 - 100
		, SCREEN_HEIGHT / 2,
		"Job1", { color: "white" })
		.setInteractive()
		.on("pointerdown", () => {
			console.log("upgrade to job1");
		});

	const job2 = scene.add.text(
		SCREEN_WIDTH / 2 + 100
		, SCREEN_HEIGHT / 2,
		"Job2", { color: "white" })
		.setInteractive()
		.on("pointerdown", () => {
			console.log("upgrade to job2");
		});

	const cancelBtn = scene.add.text(
		SCREEN_WIDTH / 2
		, SCREEN_HEIGHT / 2 + 50,
		"Cancel", { color: "white" })
		.setInteractive()
		.on("pointerdown", () => {
			bg.destroy();
			job1.destroy();
			job2.destroy();
			cancelBtn.destroy();
		});


}