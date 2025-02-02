import { Vec2, asVec2, eqVec2, vec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";

const LINE_COLOR = 0xff0000;
const LINE_WIDTH = 4;

type Index = {
	[key: string]: {
		pos: Vec2,
		container: Phaser.GameObjects.Container
	}
}

export function DestinationGoal_init(scene: BattlegroundScene) {

	const index: Index = {};

	listeners([
		[signals.SELECT_UNIT_MOVE_DONE, (unitIds: string[], target: Vec2) => {
			unitIds.forEach(id => draw(scene, index, id, target))
		}],
		[signals.BATTLEGROUND_TICK, () => {
			Object.keys(index).forEach(cleanup(index))
		}],
		[signals.DESTINATION_GOAL_TO, (unitId: string, target: Vec2) => {
			const maybeVec = index[unitId]?.pos || vec2(-1, -1);

			if (eqVec2(maybeVec, target)) {
				console.log("no need to draw", maybeVec)
				return;
			};

			draw(scene, index, unitId, target)
		}
		],
		// create event for unit drag pointer move
		// [
		// 	signals.POINTER_MO
		// ]
	])

}

const cleanup = (index: Index) => (key: string) => {

	if (!index[key]) return;

	index[key].container.destroy(true);

	delete index[key];
}


function draw(
	scene: BattlegroundScene,
	index: Index,
	unitId: string,
	target: Vec2
) {
	cleanup(index)(unitId);

	const chara = scene.getChara(unitId);

	const container = scene.add.container(0, 0)

	const source = scene.getTileAt(asVec2(chara.unit.position))
	const targetTile = scene.getTileAt(target)

	const lineGraphics = scene.add.graphics();
	lineGraphics.lineStyle(LINE_WIDTH, LINE_COLOR);

	lineGraphics.lineBetween(
		source.getCenterX(),
		source.getCenterY(),
		targetTile.getCenterX(),
		targetTile.getCenterY()
	);

	const rect = scene.add.rectangle(
		targetTile.getCenterX(),
		targetTile.getCenterY(),
		32,
		32,
		0xff0000
	)

	rect.setOrigin(0.5, 0.5)

	scene.tweens.add({
		targets: container,
		alpha: 0.2,
		duration: 2000,
		yoyo: true,
		repeat: -1,
		ease: 'Linear'
	})
	scene.children.moveBelow(container, chara.container)

	container.add([lineGraphics, rect])
	index[unitId] = {
		pos: target,
		container
	}

}