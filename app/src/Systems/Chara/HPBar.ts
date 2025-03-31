import { vec2, Vec2 } from "../../Models/Geometry";
import { listeners, signals } from "../../Models/Signals"
import { State, getBattleUnit } from "../../Models/State"
import { Unit } from "../../Models/Unit";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene"
import { HALF_TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";
import { hpColor } from "../../Utils/hpColor";

export const CHARA_SCALE = 1;
export const BAR_WIDTH = TILE_WIDTH - 10;
export const BAR_HEIGHT = 6;
export const BORDER_WIDTH = 1;

export function init(state: State, scene: BattlegroundScene) {

	let barIndex: {
		[id: string]: {
			xy: Vec2,
			bar: Phaser.GameObjects.Graphics,
			bg: Phaser.GameObjects.Graphics
		}
	} = {}

	listeners([
		[signals.CHARA_CREATED, (id: string) => {

			const chara = UnitManager.getChara(id)

			const unit = getBattleUnit(state)(id)

			if (!unit) return;

			const x = -BAR_WIDTH / 2;
			const y = HALF_TILE_HEIGHT - 10;

			const bg = scene.add.graphics();
			bg.fillStyle(0x000000, 1);
			bg.fillRect(
				x - BORDER_WIDTH, y - BORDER_WIDTH,
				BAR_WIDTH, BAR_HEIGHT
			);
			const bar = scene.add.graphics();
			drawBar(unit.hp, unit, bar, vec2(x, y));

			chara.container.add([bg, bar])

			barIndex[id] = {
				xy: vec2(x, y),
				bar,
				bg
			}

		}],
		[signals.UPDATE_UNIT, (id: string, arg: any) => {
			const { hp } = arg

			// check if argument exists
			if (hp === undefined) return

			const unit = getBattleUnit(state)(id)

			const { bar, xy } = barIndex[id]

			bar.clear()

			drawBar(hp, unit, bar, xy);
		}],
		[signals.UNIT_DESTROYED, (id: string) => {

			const { bar } = barIndex[id]

			bar.parentContainer.destroy(true);

			delete barIndex[id]

		}]
	])

}

function drawBar(hp: any, unit: Unit, bar: Phaser.GameObjects.Graphics, xy: Vec2) {
	const color = hpColor(hp, unit.maxHp);
	bar.fillStyle(Number(color), 1);
	bar.fillRect(
		xy.x, xy.y,
		calculateBarWidth(hp, unit.maxHp),
		BAR_HEIGHT - BORDER_WIDTH * 2
	);
}

function calculateBarWidth(hp: any, maxHp: number): number {
	return BAR_WIDTH * hp / maxHp - BORDER_WIDTH * 2;
}
