import Phaser from "phaser";
import * as Cards from "../../Models/Card";

const jobs = Cards.cards.map(j => j.id);

export function preload(this: Phaser.Scene) {

	[
		"victory",
		"defeat",
		"button",
		"damage_display",
		"tavern",
		"chest",
		"guild",
		"slot",
		"wood_texture"
	].forEach((asset) => {
		this.load.image(`ui/${asset}`, `assets/ui/${asset}.png`);
	});

	this.load.image("light", "assets/fx/light.png");
	this.load.image("fx/reveal-mask", "assets/fx/reveal-mask.png");
	this.load.image("beam", "assets/fx/beam.png");
	this.load.image("white-dot", "assets/fx/white-dot.png");
	this.load.image("light-pillar", "assets/fx/light-pillar.png");
	this.load.image("white-splash-fade", "assets/fx/white-splash-fade.png");

	this.load.image("bg", "assets/bgs/forest.png");
	this.load.image("city", "assets/bgs/city.png");

	this.load.image('arrow', 'assets/equips/arrow.png');


	[
		'fireball',
		'arcane_missiles',
		'feint',
		'quest',
		"chest_small",
		"chest_medium",
		"chest_large",
		'fruits',
		'endurance_training',
		'hidden_treasure',
		'job_contract',
		'merchant',
	].forEach(icon => {
		this.load.image(`icon/${icon}`, `assets/icons/${icon}.jpeg`);
	});

	[
		'old_adventurer',
		'potion_vendor',
		'equipment_vendor',
		'magic_store',
		'combat_training',
		'agility_training',
		'forest_entrance',
		'sell',
		'exit',
		'map',
	].forEach(icon => {
		this.load.image(`icon/${icon}`, `assets/icons/${icon}.png`);
	});

	this.load.audio("audio/battle_theme", [
		"assets/music/clashing_realms_suno.mp3",
		"assets/music/clashing_realms_suno.ogg",
	]);

	this.load.audio('theme', [
		'assets/audio/main_theme.mp3',
		'assets/audio/main_theme.ogg',
		//'jshaw_a_dream_of_first_flight',
	]);
	this.load.audio("audio/march", [
		"assets/audio/march.mp3",
		"assets/audio/march.ogg",
	]);
	this.load.audio("audio/sword1", "assets/audio/sword1.wav")
	this.load.audio("audio/sword2", "assets/audio/sword2.wav")
	this.load.audio("audio/sword3", "assets/audio/sword3.wav")

	this.load.audio("audio/shining", "assets/audio/shining-anime-sound-effect-240582.mp3")

	this.load.audio("audio/laser", "assets/audio/zapsplat_cartoon_anime_laser_blip_noisy_92477.mp3")

	this.load.audio("audio/curemagic", "assets/audio/oga-cure-magic1.wav")

	this.load.audio("audio/punch1", "assets/audio/punch1.ogg")

	this.load.audio("audio/chip-lay-3", "assets/audio/chip-lay-3.ogg")

	this.load.audio("ui/button_click", "assets/audio/button_click.ogg")
	this.load.audio("ui/error", "assets/audio/error.ogg");

	['blue_potion', 'red_potion', 'toxic_potion', 'burn_potion', 'gold_ring', 'iron_sword'].forEach(item => {

		this.load.image(`items/${item}`, `assets/items/${item}.png`);
	});

	this.load.image("charas/nameless", "assets/charas/nameless.png");

	jobs.forEach(job =>
		this.load.image(`charas/${job}`, `assets/charas/${job}.png`)
	);

	this.load.spritesheet(
		"pipo-light-pillar",
		`assets/fx/pipo-light-pillar.png`,
		{
			frameWidth: 192,
			frameHeight: 192,
		}
	);

	// reference to loading json data
	//this.load.json("archer-data", "assets/data/cards/archer/data.json");

	coinTexture.call(this);

}



//gold round circle with black outline
function coinTexture(this: Phaser.Scene) {
	const gfx = this.make.graphics({ x: 0, y: 0 });
	gfx.fillStyle(0xFFD700, 1);
	gfx.fillCircle(16, 16, 16);
	gfx.lineStyle(3, 0x000000, 1);
	gfx.strokeCircle(16, 16, 16);

	gfx.generateTexture('coin', 16 * 2 + 3 * 2, 16 * 2 + 3 * 2);
}

