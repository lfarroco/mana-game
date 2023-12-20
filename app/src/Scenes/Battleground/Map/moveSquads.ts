import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { CHARA_SCALE_X } from "../../../Components/chara";

const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads.forEach(squad => {
		if (squad.path.length < 1) return;


		const chara = scene.charas.find(c => c.id === squad.id)
		if (!chara) return;
		const [next] = squad.path;

		const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
		if (!nextTile) return;

		const distance = Phaser.Math.Distance.BetweenPoints(
			chara.body.getCenter(),
			{ x: nextTile.getCenterX(), y: nextTile.getCenterY() },
		);

		// distance from next
		// if close enough, remove next from path
		if (distance < 1) {
			squad.path.shift();

			const mnext = squad.path[0];
			if (!mnext) {
				// no more path, stop moving
				// TODO: emit event
				chara.body.setVelocity(0);
			}

			return;
		}

		scene.physics.moveTo(
			chara.body,
			nextTile.getCenterX(), nextTile.getCenterY(),
			30 * scene.state.speed);

		// check animation based on direction
		const currentTile = scene.layers?.background.getTileAtWorldXY(
			chara.body.x,
			chara.body.y,
		);

		if (!currentTile) return

		const dx = nextTile.x - currentTile.x;
		const dy = nextTile.y - currentTile.y;

		if (dx === 1) {
			chara.sprite.play("walk-right", true)
		} else if (dx === -1) {
			chara.sprite.play("walk-left", true)
		} else if (dy === 1) {
			chara.sprite.play("walk-down", true)
		} else if (dy === -1) {
			chara.sprite.play("walk-up", true)
		}


		squad.position.x = chara.body.x;
		squad.position.y = chara.body.y;
	});
}

export default moveSquads