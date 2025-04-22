import Phaser from "phaser";
import * as Job from "../../Models/Job";

const jobs = Job.jobs.map(j => j.id);

const emotes = [
	'moving-emote',
	'defend-emote',
	'combat-emote',
	'arrow-bottom-emote', // TODO: rename to arrow-down to match the DIRECTIONS const
	'arrow-left-emote',
	'arrow-right-emote',
	'arrow-top-emote',// TODO: rename to arrow-up to match the DIRECTIONS const
	'exclamation-emote',
	'question-emote',
	'sing-emote',
	'skull-emote',
	'sleep-emote',
	'sparkle-emote',
	'surprise-emote',
	'surprise2-emote',
	'magic-emote',
	'sweat-emote',
	'v-hand-emote',
]

export function preload(this: Phaser.Scene) {
	["castle", "cave", "fort", "town", "tavern"].forEach(city => {
		this.load.image(city, `assets/cities/${city}.png`);
		this.load.image(`${city}_map`, `assets/cities/${city}_map.png`);

	});
	this.load.image("ui/button", "assets/ui/button.png");
	this.load.image("light", "assets/fx/light.png");
	this.load.image("beam", "assets/fx/beam.png");
	this.load.image("white-dot", "assets/fx/white-dot.png");
	this.load.image("light-pillar", "assets/fx/light-pillar.png");
	this.load.image("white-splash-fade", "assets/fx/white-splash-fade.png");
	this.load.image("damage_display", "assets/ui/damage_display.png");

	this.load.image("bg", "assets/bgs/forest.jpeg");
	this.load.image("cave_entrance", "assets/bgs/cave_entrance.jpeg");

	this.load.image('arrow', 'assets/equips/arrow.png');

	['advance', 'explore', 'rest', 'merchant'].forEach(card => {
		this.load.image(`cards/${card}`, `assets/cards/${card}.jpeg`);
	});

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
	this.load.audio("ui/error", "assets/audio/error.ogg")

	this.load.image("ui/chest", "assets/ui/chest.png")
	this.load.image("ui/slot", "assets/ui/slot.png")
	this.load.image("ui/wood_texture", "assets/ui/wood_texture.png");

	['blue_potion', 'red_potion', 'toxic_potion', 'burn_potion', 'gold_ring', 'iron_sword'].forEach(item => {

		this.load.image(`items/${item}`, `assets/items/${item}.png`);
	});

	jobs.forEach(job => {
		this.load.svg(`charas/${job}`, `assets/charas/${job}.svg`, { scale: 3 });
	});

	emotes.forEach(emote => {

		this.load.spritesheet(
			emote,
			`assets/emotes/${emote}.png`,
			{
				frameWidth: 32,
				frameHeight: 32,
			}
		);

	});


	this.load.spritesheet(
		"pipo-light-pillar",
		`assets/fx/pipo-light-pillar.png`,
		{
			frameWidth: 192,
			frameHeight: 192,
		}
	);

	//once all assets are loaded, create animations
	this.load.on("complete", () => {

		emotes.forEach(emote => {
			this.anims.create({
				key: emote,
				frames: this.anims.generateFrameNumbers(emote, { start: 0, end: 2 }),
				frameRate: 3,
				repeat: -1,
			});
		});

		this.anims.create({
			key: "pipo-light-pillar",
			frames: this.anims.generateFrameNumbers("pipo-light-pillar", { start: 0, end: 9 }),
			frameRate: 10,
			repeat: -1,
		});
	});

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

