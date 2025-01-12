import Phaser from "phaser";

const jobs = [
	'archer',
	'monk',
	'cleric',
	'soldier',
	'orc',
]

const fxs = ['cethiel_light'];

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
	this.load.tilemapTiledJSON("maps/map1", "assets/maps/map1/mapdata.json");

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

	this.load.audio("ui/button_click", "assets/audio/button_click.ogg")
	this.load.audio("ui/error", "assets/audio/error.ogg")

	jobs.forEach(job => {
		this.load.image(
			job,
			`assets/charas/${job}.png`,
		);
	})

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

	fxs.forEach(fx => {
		this.load.spritesheet(
			fx,
			`assets/fx/${fx}.png`,
			{
				frameWidth: 64,
				frameHeight: 64,
			}
		);
	})

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

		fxs.forEach(fx => {
			this.anims.create({
				key: fx,
				frames: this.anims.generateFrameNumbers(fx, { start: 0, end: 4 }),
				frameRate: 5,
				repeat: -1,
			});
		});
	});

}


