import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { listeners, signals } from "../../Models/Signals";
import { asVec2, eqVec2, vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../Models/Force";
import { getJob, Job } from "../../Models/Job";
import { getSkill } from "../../Models/Skill";
import * as UIManager from "../../Scenes/Battleground/Systems/UIManager";

export type Chara = {
	id: string;
	force: string;
	job: Job;
	sprite: Phaser.GameObjects.Image,
	scene: BattlegroundScene,
	unit: Unit,
	container: Phaser.GameObjects.Container,
	hightlightTween: Phaser.Tweens.Tween | null,
}

const spriteSize = bgConstants.TILE_WIDTH - 4;

export const CHARA_SCALE = 1;

let unitInfoContainer: Phaser.GameObjects.Container | null = null;

export function createChara(
	scene: BattlegroundScene,
	unit: Unit,
): Chara {

	const container = scene.add.container(
		unit.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
		unit.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT
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
		job: getJob(unit.job),
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
		if (chara.unit.force !== FORCE_ID_PLAYER) return;
		chara.container.x = pointer.x;
		chara.container.y = pointer.y;
	});

	chara.sprite.on('drop', (
		pointer: Phaser.Input.Pointer,
		zone: Phaser.GameObjects.GameObject,
	) => {

		const tile = scene.getTileAt(vec2(pointer.worldX, pointer.worldY));

		const charaUnit = scene.state.gameData.units.find(u => u.id === chara.id)!;

		const position = vec2(tile.x, tile.y)

		const maybeOccupier = scene.state.gameData.units.find(u => eqVec2(u.position, position));

		if (maybeOccupier) {
			const occupierChara = scene.getChara(maybeOccupier.id);

			console.log("position for occupier", asVec2(charaUnit.position));
			maybeOccupier.position = asVec2(charaUnit.position);

			tween({
				targets: [occupierChara.container],
				duration: 500,
				ease: 'Power2',
				x: maybeOccupier.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
				y: maybeOccupier.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT,
			})
		}

		console.log("position for dropped:: ", position);
		charaUnit.position = position;

		tween({
			targets: [chara.container],
			duration: 500,
			ease: 'Power2',
			x: position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
			y: position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT,
		})

	});

	chara.sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {

		// check if it was a click or drag
		if (pointer.getDistance() < 10) {

			displayUnitInfo(chara);

			return;
		}

		// check if the drag ended inside or outside scene.dropZone

		if (!UIManager.dropZone?.getBounds().contains(pointer.x, pointer.y)) {
			tween({
				targets: [chara.container],
				duration: 500,
				ease: 'Power2',
				x: chara.unit.position.x * bgConstants.TILE_WIDTH + bgConstants.HALF_TILE_WIDTH,
				y: chara.unit.position.y * bgConstants.TILE_HEIGHT + bgConstants.HALF_TILE_HEIGHT,
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
				duration: 400 / scene.speed,
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
		[signals.END_STATUS, (unitId: string, status: string) => {

			const chara = scene.getChara(unitId);

			chara.container.getByName("status-" + status)?.destroy();

		}]

	])

}

// create a rect with the unit's portrait and stats
// to the right of the sprite
function displayUnitInfo(chara: Chara) {

	unitInfoContainer?.destroy();

	const { scene, unit } = chara;

	const job = getJob(unit.job);

	const x = 0;
	const y = bgConstants.TILE_HEIGHT * 1;
	const width = bgConstants.TILE_WIDTH * 3;
	const height = bgConstants.TILE_HEIGHT * 5;

	// bg is a round rect with a beige gradient fill
	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.7);
	bg.fillRoundedRect(0, 0, width, height, 10);

	unitInfoContainer = scene.add.container(x, y);
	unitInfoContainer.add([bg]);

	unitInfoContainer.add([
		scene.add.image(0, 0, job.id + "/full")
			.setDisplaySize(bgConstants.TILE_WIDTH * 3, bgConstants.TILE_WIDTH * 3)
			.setOrigin(0),
		scene.add.text(10, 10, job.name, bgConstants.defaultTextConfig),
		...job.skills
			.reverse()
			.map(getSkill)
			.map(
				(sk, i) =>
					scene.add.text(
						10, (bgConstants.TILE_HEIGHT * 3) + 60 + i * 50,
						sk.name, bgConstants.defaultTextConfig))
	]);

	const closeBtn = scene.add.text(
		width - 40, 10, "X", bgConstants.defaultTextConfig)
		.setInteractive()
		.on("pointerdown", () => {
			unitInfoContainer?.destroy();
		}
		);

	unitInfoContainer.add(closeBtn);

	UIManager.ui?.add(unitInfoContainer);
}