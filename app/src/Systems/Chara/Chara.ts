import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import * as bgConstants from "../../Scenes/Battleground/constants";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { emit, listeners, signals } from "../../Models/Signals";
import { asVec2, eqVec2, vec2, Vec2 } from "../../Models/Geometry";
import { tween } from "../../Utils/animation";
import { TURN_DURATION } from "../../config";
import { FORCE_ID_PLAYER } from "../../Models/Force";
import { getJob, Job } from "../../Models/Job";
import { getSkill } from "../../Models/Skill";

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
		chara.container.x = pointer.x;
		chara.container.y = pointer.y;
	});

	chara.sprite.on('drop', (
		pointer: Phaser.Input.Pointer,
		zone: Phaser.GameObjects.GameObject,
	) => {

		const tile = scene.getTileAtWorldXY(vec2(pointer.worldX, pointer.worldY));

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

		if (!scene.dropZone?.getBounds().contains(pointer.x, pointer.y)) {
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
	const y = 100;
	const width = 300;
	const height = 500;

	// bg is a round rect with a beige gradient fill
	const bg = scene.add.graphics();
	bg.fillGradientStyle(0xc1a272, 0xc1a272, 0x8b6d45, 0x8b6d45, 1);
	bg.fillRect(0, 0, width, height);






	unitInfoContainer = scene.add.container(x, y);
	unitInfoContainer.add([bg]);

	unitInfoContainer.add([
		scene.add.text(10, 10, job.name, bgConstants.defaultTextConfig),
		scene.add.image(20, 50, job.id + "/full").setDisplaySize(200, 200).setOrigin(0),
		...job.skills.reverse().map(getSkill).map(
			(sk, i) => scene.add.text(10, 300 + i * 50, sk.name, bgConstants.defaultTextConfig))
	]
	)

	const updgradeBtn = scene.add.text(10, 410,
		`Promote (${bgConstants.PROMOTE_UNIT_PRICE} gold) `,
		bgConstants.defaultTextConfig)
		.setInteractive()
		.on("pointerdown", () => {

			upgradeWindow(unitInfoContainer!, chara)
		});

	const force = scene.playerForce;

	if (force.gold < bgConstants.PROMOTE_UNIT_PRICE) {
		updgradeBtn.setTint(0x666666);
		updgradeBtn.removeInteractive();
	}

	const closeBtn = scene.add.text(
		width - 80, 10, "X", bgConstants.defaultTextConfig)
		.setInteractive()
		.on("pointerdown", () => {
			unitInfoContainer?.destroy();
		}
		);

	unitInfoContainer.add(closeBtn);


	unitInfoContainer.add(updgradeBtn);

}

function upgradeWindow(
	parent: Phaser.GameObjects.Container,
	chara: Chara,
) {
	// display two rects with two job options 

	const { scene, unit } = chara;

	const width = bgConstants.SCREEN_WIDTH;
	const height = bgConstants.SCREEN_HEIGHT;

	const job = getJob(unit.job)

	const container = scene.add.container(0, 0);


	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.6);
	bg.fillRect(0, 0, width, height);
	bg.setInteractive(
		new Phaser.Geom.Rectangle(0, 0, width, height),
		Phaser.Geom.Rectangle.Contains
	)
	container.add(bg);

	job.upgrades.forEach((jobId, i) => {

		const jobUpgrade = getJob(jobId);

		const x = i * 500 + 300;

		const pic = scene.add.image(
			x,
			300,
			jobId + "/full"
		).setDisplaySize(400, 400)
			.setInteractive()
			.on("pointerdown", () => {
				console.log("Promote to job1");
			});
		pic.on("pointerover", () => {
			tween({
				targets: [pic],
				duration: 200,
				displayWidth: 420,
				displayHeight: 420,
			})
		})
			.on("pointerout", () => {
				tween({
					targets: [pic],
					duration: 200,
					displayWidth: 400,
					displayHeight: 400,
				})
			})
			.setInteractive()
			.on("pointerdown", () => {

				chara.container.destroy();

				scene.charas = scene.charas.filter(c => c.id !== chara.id);

				unit.job = jobId;
				unit.hp = jobUpgrade.hp;
				unit.maxHp = jobUpgrade.hp;

				scene.playerForce.gold -= bgConstants.PROMOTE_UNIT_PRICE;

				console.log("gold :: ", scene.playerForce.gold);

				scene.renderUnit(unit);
				container.destroy();
				parent.destroy();
				scene.updateUI();

			});

		const title = scene.add.text(
			x
			, pic.y + 220,
			jobUpgrade.name, bgConstants.defaultTextConfig)
			.setOrigin(0.5);


		const description = scene.add.text(
			x - 200
			, pic.y + 250,
			jobUpgrade.name, bgConstants.defaultTextConfig)
			.setText(jobUpgrade.description)

		container.add([pic, title, description]);

	});


	const cancelBtn = scene.add.text(
		bgConstants.SCREEN_WIDTH / 2 - 140
		, bgConstants.SCREEN_HEIGHT / 2 + 300,
		"Cancel", bgConstants.defaultTextConfig)
		.setInteractive()
		.on("pointerdown", () => {
			container.destroy();

		});

	container.add([bg, cancelBtn]);

}