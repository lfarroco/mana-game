import { Direction } from "../../Models/Direction";
import { events, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {

	listeners([
		[events.FACE_DIRECTION, (id: string, direction: Direction) => {

			const chara = scene.charas.find(c => c.id === id);

			if (!chara) throw new Error("chara not found");

			switch (direction) {
				case "up":
					chara.sprite.play(chara.job + "-walk-up", true);
					break;
				case "down":
					chara.sprite.play(chara.job + "-walk-down", true);
					break;
				case "left":
					chara.sprite.play(chara.job + "-walk-left", true);
					break;
				case "right":
					chara.sprite.play(chara.job + "-walk-right", true);
					break;
			}

		}]
	])

}