import { FORCE_ID_PLAYER } from "../../Models/Force";
import { asVec2, vec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { emit, listeners, signals } from "../../Models/Signals";
import { makeUnit, Unit } from "../../Models/Unit";
import { BattlegroundScene } from "./BattlegroundScene";
import { SCREEN_WIDTH } from "./constants";

let units: Unit[] = [];

let container: Phaser.GameObjects.Container | null = null;
let jobDetails: Phaser.GameObjects.Container | null = null;

export function init(scene: BattlegroundScene) {

	units = units.concat([
		makeUnit(Math.random().toString(), FORCE_ID_PLAYER, "soldier", asVec2({ x: 0, y: 0 })),
		makeUnit(Math.random().toString(), FORCE_ID_PLAYER, "archer", asVec2({ x: 0, y: 0 })),
		makeUnit(Math.random().toString(), FORCE_ID_PLAYER, "cleric", asVec2({ x: 0, y: 0 })),
	])

	listeners([
		[signals.BATTLE_START, async () => {
			container?.destroy(true);
		}]
	])
}

export function updateStore(scene: BattlegroundScene) {

	if (container) container.destroy(true);

	const width = scene.cameras.main.width;
	const height = 200;
	const x = 0;
	const y = 0;

	const force = scene.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
	const gold = force.gold;

	container = scene.add.container(x, y);

	// black rect
	const bg = scene.add.graphics();
	bg.fillStyle(0x000000, 0.8);
	bg.fillRect(0, 0, width, height);

	container.add(bg);

	units.forEach(renderUnit(scene));

	const goldText = scene.add.text(width - 100, 50, `Gold: ${gold}`, { color: "white" });

	container.add(goldText);
}

const renderUnit = (scene: BattlegroundScene) => (unit: Unit, i: number) => {

	const force = scene.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

	const job = getJob(unit.job);

	const x = 350 + i * 200;
	const y = 100;

	const sprite = scene.add.image(
		x, y,
		job.id + "/portrait")
		.setOrigin(0.5, 0.5)
		.setDisplaySize(96, 96)
		.setAlpha(force.gold >= 1 ? 1 : 0.5);

	container?.add(sprite);

	const name = scene.add.text(x - 25, y + 60, job.name, { color: "white", align: "center" });
	container?.add(name);

	sprite.setInteractive({ draggable: true });

	sprite.on('pointerdown', () => {
		if (force.gold > 0) return

		scene.displayError("Not enough gold");

	})

	if (force.gold < 1) return;


	sprite.on('dragstart', (pointer: Phaser.Input.Pointer) => {

		scene.children.bringToTop(container!);

	});

	sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		sprite.x = dragX;
		sprite.y = dragY;
	});

	sprite.on('drop', (pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Graphics) => {

		console.log("dropped on zone", zone.name);

		if (zone.name === "board") {

			if (scene.state.gameData.units.filter(u => u.force === FORCE_ID_PLAYER).length >= force.maxUnits) {
				scene.displayError("Max units reached");
				return;
			}

			const coords = scene.getTileAtWorldXY(vec2(pointer.worldX, pointer.worldY));
			console.log("dropped on tile", coords);

			force.gold -= 1;
			emit(signals.RECRUIT_UNIT, FORCE_ID_PLAYER, unit.job, asVec2(coords));

			scene.updateMaxUnitsDisplay();
		}

	});

	sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {

		if (pointer.getDistance() < 10) {
			console.log("low pointer distance: click");
			handleClick(scene, unit)(pointer);
		}
		// dragend happens after drop
		scene.renderStore();

	});
}

const handleClick = (
	scene: BattlegroundScene,
	unit: Unit,
) => (pointer: Phaser.Input.Pointer) => {

	jobDetails?.destroy(true);

	const width = 250;
	const height = 300;
	const x = SCREEN_WIDTH - width;
	const y = 200;

	jobDetails = scene.add.container(x, y);

	const job = getJob(unit.job)

	const bg = scene.add.graphics();
	bg.fillStyle(0x000077, 0.8);
	bg.fillRect(0, 0, width, height);

	const btn = scene.add.text(10, 200, "Recruit", { color: "white" });

	jobDetails.add([
		bg,
		scene.add.text(10, 10, job.name, { color: "white" }),
		scene.add.text(10, 30, `HP: ${job.stats.hp}`, { color: "white" }),
		scene.add.text(10, 50, `Attack: ${job.stats.attack}`, { color: "white" }),
		scene.add.text(10, 70, `Defense: ${job.stats.defense}`, { color: "white" }),
		scene.add.text(10, 130, `Accuracy: ${job.stats.accuracy}`, { color: "white" }),
		scene.add.text(10, 150, `Agility: ${job.stats.agility}`, { color: "white" }),
		scene.add.text(10, 170, `Skill: ${job.skill}`, { color: "white" }),
		btn
	]);

	btn.setInteractive();
	btn.on('pointerdown', () => {
		console.log("recruit unit", unit);
		// TODO: find empty tile
		emit(signals.RECRUIT_UNIT, FORCE_ID_PLAYER, unit.job, asVec2({ x: 5, y: 5 }));
		scene.renderStore();
		jobDetails?.destroy(true);
	});

}