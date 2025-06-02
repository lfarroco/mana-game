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

function loadAudio(_scene: Scene) {

	// this.load.audio("audio/battle_theme", [
	// 	"assets/music/clashing_realms_suno.mp3",
	// 	"assets/music/clashing_realms_suno.ogg",
	// ]);

	// this.load.audio('theme', [
	// 	'assets/audio/main_theme.mp3',
	// 	'assets/audio/main_theme.ogg',
	// ]);
	// this.load.audio("audio/march", [
	// 	"assets/audio/march.mp3",
	// 	"assets/audio/march.ogg",
	// ]);
	// this.load.audio("audio/sword1", "assets/audio/sword1.wav")
	// this.load.audio("audio/sword2", "assets/audio/sword2.wav")
	// this.load.audio("audio/sword3", "assets/audio/sword3.wav")

	// this.load.audio("audio/shining", "assets/audio/shining-anime-sound-effect-240582.mp3")

	// this.load.audio("audio/laser", "assets/audio/zapsplat_cartoon_anime_laser_blip_noisy_92477.mp3")

	// this.load.audio("audio/curemagic", "assets/audio/oga-cure-magic1.wav")

	// this.load.audio("audio/punch1", "assets/audio/punch1.ogg")

	// this.load.audio("audio/chip-lay-3", "assets/audio/chip-lay-3.ogg")

	// this.load.audio("ui/button_click", "assets/audio/button_click.ogg")
	// this.load.audio("ui/error", "assets/audio/error.ogg");

}