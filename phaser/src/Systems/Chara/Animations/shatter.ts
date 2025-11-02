import { getCurrentScene } from "@Models/State";
import { tween } from "@Utils/animation";
import Phaser from "phaser";
import { Chara, mustGetState } from "../Chara";

export async function shatter(chara: Chara) {

	const scene = getCurrentScene();

	const state = mustGetState(chara);

	//shake the container
	chara.x = chara.x + 10;

	await tween({
		targets: [chara],
		x: chara.x - 20,
		repeat: 10,
		duration: 100,
		yoyo: true
	});

	state.sprite.visible = false;

	const image = scene.add.rexShatterImage(chara.x, chara.y, state.sprite.texture.key);

	image.setScale(
		state.sprite.scaleX,
		state.sprite.scaleY
	);

	image.shatter(
		image.x, image.y,
		{
			ringRadiusList: [1 / 10, 3 / 10],
			samplesPerRing: 4,
			variation: 0.4
		}
	);

	image.startUpdate();

	await tween({
		targets: image.faces,
		alpha: 0,
		//angle: () => Phaser.Math.Between(-360, 360),
		x: (face: Phaser.Geom.Mesh.Face) => face.x += Phaser.Math.Between(-1, 1),
		y: (face: Phaser.Geom.Mesh.Face) => face.y += Phaser.Math.Between(-1, 1),
		duration: 3000,
		ease: 'Power2',
		//delay: this.tweens.stagger(30, {}),
	});

	image.stopUpdate();

}
