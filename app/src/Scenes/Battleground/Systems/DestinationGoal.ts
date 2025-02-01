import { Vec2, asVec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";

const LINE_COLOR = 0xff0000;
const LINE_WIDTH = 4;

type Index = { [key: string]: Phaser.GameObjects.Container }

export function DestinationGoal_init(scene: BattlegroundScene) {

	const index: Index = {};

	listeners([
		[signals.SELECT_UNIT_MOVE_DONE, (unitIds: string[], target: Vec2) => {
			unitIds.forEach(id => draw(scene, index, id))
		}],
		[signals.BATTLEGROUND_TICK, () => {
			Object.keys(index).forEach(cleanup(index))
		}]
	])

}

const cleanup = (index: Index) => (key: string) => {

	if (!index[key]) return;

	index[key].destroy(true);

	delete index[key];
}


function draw(
	scene: BattlegroundScene,
	index: Index,
	unitId: string,
) {
	cleanup(index)(unitId);

	const chara = scene.getChara(unitId);

	if (chara.unit.order.type !== "move") return;

	const container = scene.add.container(0, 0)

	const source = scene.getTileAt(asVec2(chara.unit.position))

	const target = scene.getTileAt(asVec2(chara.unit.order.cell))

	const lineGraphics = scene.add.graphics();
	lineGraphics.lineStyle(LINE_WIDTH, LINE_COLOR);

	lineGraphics.lineBetween(
		source.getCenterX(),
		source.getCenterY(),
		target.getCenterX(),
		target.getCenterY()
	);

	const rect = scene.add.rectangle(
		target.getCenterX(),
		target.getCenterY(),
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
	scene.children.moveBelow(lineGraphics, chara.container)

	container.add([lineGraphics, rect])
	index[unitId] = container;

}