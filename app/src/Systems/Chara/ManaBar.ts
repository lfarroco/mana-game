import { listeners, signals } from "../../Models/Signals"
import { State, getUnit } from "../../Models/State"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene"
import { HALF_TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";

export const CHARA_SCALE = 1;
export const BAR_WIDTH = TILE_WIDTH / 2;
export const BAR_HEIGHT = 6;
export const BORDER_WIDTH = 1;
const COLOR = 0x40c4ff

export function init(state: State, scene: BattlegroundScene) {

	let barIndex: {
		[id: string]: {
			bar: Phaser.GameObjects.Graphics,
			bg: Phaser.GameObjects.Graphics
		}
	} = {}

	listeners([
		[signals.CHARA_CREATED, (id: string) => {

			const chara = scene.getChara(id)

			const unit = getUnit(state)(id)

			if (unit.maxMana === 0) return

			const bg = scene.add.graphics();
			bg.fillStyle(0x000000, 1);
			bg.fillRect(
				0,
				0,
				BAR_WIDTH,
				BAR_HEIGHT
			);
			const bar = scene.add.graphics();
			bar.fillStyle(COLOR, 1);
			bar.fillRect(
				0,
				0,
				calculateBarWidth(unit.mana, unit.maxMana),
				BAR_HEIGHT - BORDER_WIDTH * 1
			);

			const follow = () => {
				bg.x = chara.sprite.x - BAR_WIDTH / 2;
				bg.y = chara.sprite.y + HALF_TILE_HEIGHT - BAR_HEIGHT * 1;
				bar.x = bg.x + BORDER_WIDTH;
				bar.y = bg.y + BORDER_WIDTH
			};

			//make bars follow sprite
			scene.events.on("update", follow);
			//destroy listener on element destroy
			chara.sprite.once("destroy", () => {
				scene.events.off("update", follow);
			});

			chara.group?.addMultiple([bg, bar])

			barIndex[id] = {
				bar,
				bg
			}

		}],
		[signals.UPDATE_UNIT, (id: string, arg: any) => {
			const { mana } = arg

			// check if mana is defined (it may be 0)
			if (mana === undefined) return

			const unit = getUnit(state)(id)

			const { bar } = barIndex[id]

			bar.clear()
			bar.fillStyle(COLOR, 1);
			bar.fillRect(
				0,
				0,
				calculateBarWidth(mana, unit.maxMana),
				BAR_HEIGHT - BORDER_WIDTH * 2
			);
		}],
		[signals.UNIT_DESTROYED, (id: string) => {

			const graphics = barIndex[id]
			if (!graphics) return

			const { bar, bg } = graphics


			bar.destroy()
			bg.destroy()

			delete barIndex[id]

		}]
	])

}

function calculateBarWidth(current: number, max: number): number {
	return BAR_WIDTH * current / max - BORDER_WIDTH * 2;
}
