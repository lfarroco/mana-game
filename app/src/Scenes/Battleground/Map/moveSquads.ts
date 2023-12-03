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
				chara.spine.animationState.setAnimation(0, "map-idle", true)
			}

			return;
		}

		scene.physics.moveTo(
			chara.body,
			nextTile.getCenterX(), nextTile.getCenterY(),
			30 * scene.state.speed);

		if (Math.abs(chara.body.body.velocity.y) < 10) {
			chara.spine.scaleX = (
				chara.body.body.velocity.x > 0
			) ? -1 * CHARA_SCALE_X : CHARA_SCALE_X;
		}

		squad.position.x = chara.body.x;
		squad.position.y = chara.body.y;
	});
}

export default moveSquads