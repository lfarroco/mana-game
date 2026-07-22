import { tween } from "@Utils/animation";
import Phaser from "phaser";
import { Chara, mustGetState } from "@Systems/Chara/Chara";
import { playSoundEffect } from "@Systems/AudioManager";
import { env } from "@Env";

// Shatter death animation constants
const SHAKE_OFFSET_X = 10;
const SHAKE_RANGE_X = 20;
const SHAKE_REPEAT_COUNT = 10;
const SHAKE_DURATION_MS = 100;
const SHATTER_ANIMATION_DURATION_MS = 1500;
const SHATTER_SAMPLES_PER_RING = 4;
const SHATTER_VARIATION = 0.4;
const SHATTER_RING_RADIUS_NEAR = 1 / 10;
const SHATTER_RING_RADIUS_FAR = 3 / 10;

export async function shatter(chara: Chara) {
	const state = mustGetState(chara);

	const { sprite } = state;

	//shake the container
	sprite.x = sprite.x + SHAKE_OFFSET_X;

	await tween({
		targets: [sprite],
		x: sprite.x - SHAKE_RANGE_X,
		repeat: SHAKE_REPEAT_COUNT,
		duration: SHAKE_DURATION_MS,
		yoyo: true,
	});

	sprite.visible = false;

	const image = env.scene.add.rexShatterImage(chara.x, chara.y, state.sprite.texture.key);

	image.setScale(sprite.scaleX, sprite.scaleY);

	image.shatter(image.x, image.y, {
		ringRadiusList: [SHATTER_RING_RADIUS_NEAR, SHATTER_RING_RADIUS_FAR],
		samplesPerRing: SHATTER_SAMPLES_PER_RING,
		variation: SHATTER_VARIATION,
	});

	playSoundEffect("sfx_voidhunter_death");

	image.startUpdate();

	await tween({
		targets: image.faces,
		alpha: 0,
		//angle: () => Phaser.Math.Between(-360, 360),
		x: (face: Phaser.Geom.Mesh.Face) => (face.x += Phaser.Math.Between(-1, 1)),
		y: (face: Phaser.Geom.Mesh.Face) => (face.y += Phaser.Math.Between(-1, 1)),
		duration: SHATTER_ANIMATION_DURATION_MS,
		ease: "Power2",
		//delay: this.tweens.stagger(30, {}),
	});

	image.stopUpdate();
}
