import { listeners, signals } from "../../Models/Signals"
import { State, getSquad } from "../../Models/State"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene"
import { HALF_TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import { hpColor } from "../../Utils/hpColor";

export const CHARA_SCALE = 1;
export const EMOTE_SCALE = 1;
export const BAR_WIDTH = TILE_WIDTH / 2;
export const BAR_HEIGHT = 6;
export const BORDER_WIDTH = 1;

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

			const squad = getSquad(state)(id)

			const bg = scene.add.graphics();
			bg.fillStyle(0x000000, 1);
			bg.fillRect(
				0,
				0,
				BAR_WIDTH,
				BAR_HEIGHT
			);
			const bar = scene.add.graphics();
			const color = hpColor(squad.hp, squad.maxHp)
			bar.fillStyle(Number(color), 1);
			bar.fillRect(
				0,
				0,
				calculateBarWidth(squad.hp, squad.maxHp),
				BAR_HEIGHT - BORDER_WIDTH * 2
			);

			const follow = () => {
				bg.x = chara.sprite.x - BAR_WIDTH / 2;
				bg.y = chara.sprite.y + HALF_TILE_HEIGHT - BAR_HEIGHT * 2;
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
		[signals.UPDATE_SQUAD, (id: string, arg: any) => {
			const { hp } = arg

			// check if hp is defined (it may be 0)
			if (hp === undefined) return

			const squad = getSquad(state)(id)

			const { bar } = barIndex[id]

			bar.clear()
			const color = hpColor(hp, squad.maxHp)
			bar.fillStyle(Number(color), 1);
			bar.fillRect(
				0,
				0,
				calculateBarWidth(hp, squad.maxHp),
				BAR_HEIGHT - BORDER_WIDTH * 2
			);
		}],
		[signals.SQUAD_DESTROYED, (id: string) => {

			const { bar, bg } = barIndex[id]

			bar.destroy()
			bg.destroy()

			delete barIndex[id]

		}]
	])

}

function calculateBarWidth(hp: any, maxHp: number): number {
	return BAR_WIDTH * hp / maxHp - BORDER_WIDTH * 2;
}
