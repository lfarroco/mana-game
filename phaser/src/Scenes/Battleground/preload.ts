import Phaser from "phaser";
import { images } from "../../assets";

export function preload(this: Phaser.Scene) {

	Object.values(images).forEach((image) => {
		this.load.image(image);
	});

	// reference to loading json data
	this.load.json("base-collection", "assets/data/collections/base/data.json");

	coinTexture(this);

	loadAudio(this);

}

//gold round circle with black outline
function coinTexture(scene: Scene) {
	const gfx = scene.make.graphics({ x: 0, y: 0 });
	gfx.fillStyle(0xFFD700, 1);
	gfx.fillCircle(16, 16, 16);
	gfx.lineStyle(3, 0x000000, 1);
	gfx.strokeCircle(16, 16, 16);

	gfx.generateTexture('coin', 16 * 2 + 3 * 2, 16 * 2 + 3 * 2);
}

function loadAudio(scene: Scene) {

	scene.load.audio('sfx_artifact_equipmask', 'assets/audio/sfx_artifact_equipmask.m4a');

	scene.load.audio('sfx_notification', 'assets/audio/notification.m4a');

	scene.load.audio('sfx_spell_innerfocus', 'assets/audio/sfx_spell_innerfocus.m4a');

}