import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";

const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads.forEach(squad => {
		if (squad.path.length < 1) return;

		const sprite = scene.charas.find(c => c.id === squad.id)?.body
		if (!sprite) return;
		const [next] = squad.path;

		const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
		if (!nextTile) return;

		const distance = Phaser.Math.Distance.BetweenPoints(
			sprite.getCenter(),
			{ x: nextTile.getCenterX(), y: nextTile.getCenterY() },
		);

		// distance from next
		// if close enough, remove next from path
		if (distance < 1) {
			squad.path.shift();

			const mnext = squad.path[0];
			if (!mnext) {
				// no more path, stop moving
				sprite.body.setVelocity(0);
			}

			return;
		}

		scene.scene.scene.physics.moveTo(sprite, nextTile.getCenterX(), nextTile.getCenterY(), 30);

		squad.position.x = sprite.body.x;
		squad.position.y = sprite.body.y;
	});
}

export default moveSquads