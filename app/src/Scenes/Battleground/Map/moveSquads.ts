import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { CHARA_SCALE_X } from "../../../Components/chara";

const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads.forEach(squad => {
		if (squad.path.length < 1) return;

		const chara = scene.charas.find(c => c.id === squad.id)
		if (!chara) return;
		const [next] = squad.path;

		const currentTile = squad.position

		const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
		if (!nextTile) return;

		scene.tweens.add({
			targets: chara.body,
			x: nextTile.getCenterX(),
			y: nextTile.getCenterY(),
			duration: 500 / scene.state.speed,
			yoyo: false,
			ease: "Sine.easeInOut",
		})

		squad.path.shift();

		const dx = nextTile.x - currentTile.x;
		const dy = nextTile.y - currentTile.y;

		if (dx === 1) {
			chara.sprite.play(chara.job + "-walk-right", true)
		} else if (dx === -1) {
			chara.sprite.play(chara.job + "-walk-left", true)
		} else if (dy === 1) {
			chara.sprite.play(chara.job + "-walk-down", true)
		} else if (dy === -1) {
			chara.sprite.play(chara.job + "-walk-up", true)
		}

		squad.position.x = nextTile.x
		squad.position.y = nextTile.y

	});
}

export default moveSquads