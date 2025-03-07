import Phaser from "phaser";

const jobs = [
	'archer',
	'acolyte',
	'apprentice',
	'arcanist',
	'elementalist',
	'knight',
	'berserker',
	'soldier',
	'monk',
	'cleric',
	'thief',
	'blob',
	'blob_king'
]

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
	this.load.image("tilesets/tileset", "assets/tilesets/tileset.png");
	this.load.image("cursor", "assets/ui/selected_cursor.png");
	this.load.image("light", "assets/fx/light.png");
	this.load.image("beam", "assets/fx/beam.png");
	this.load.image("white-dot", "assets/fx/white-dot.png");
	this.load.image("light-pillar", "assets/fx/light-pillar.png");
	this.load.image("damage_display", "assets/ui/damage_display.png");
	this.load.tilemapTiledJSON("maps/map1", "assets/maps/map1/mapdata.json");

	this.load.image('arrow', 'assets/equips/arrow.png');

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

	jobs.forEach(job => {
		// this.load.image(
		// 	job,
		// 	`assets/charas/${job}.png`,
		// );
		this.load.image(
			`${job}/portrait`,
			`assets/jobs/${job}/portrait.png`,
		)
	});

	jobs.forEach(job => {
		this.load.image(
			`${job}/full`,
			`assets/jobs/${job}/full.jpeg`,
		)
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
		"cethiel-light",
		`assets/fx/cethiel-light.png`,
		{
			frameWidth: 64,
			frameHeight: 64,
		}
	);
	this.load.spritesheet(
		"cethiel-slash",
		`assets/fx/cethiel-slash.png`,
		{
			frameWidth: 150,
			frameHeight: 150,
		}
	);
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
			key: "cethiel-light",
			frames: this.anims.generateFrameNumbers("cethiel-light", { start: 0, end: 4 }),
			frameRate: 5,
			repeat: -1,
		});
		this.anims.create({
			key: "cethiel-slash",
			frames: this.anims.generateFrameNumbers("cethiel-slash", { start: 0, end: 5 }),
			frameRate: 12,
			repeat: 0,
		});
		this.anims.create({
			key: "pipo-light-pillar",
			frames: this.anims.generateFrameNumbers("pipo-light-pillar", { start: 0, end: 9 }),
			frameRate: 10,
			repeat: -1,
		});
	});

}


