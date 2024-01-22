import Phaser from "phaser";

const jobs = [
	'archer',
	'barbarian',
	'cleric',
	'goblin-archer',
	'goblin-knight',
	'goblin-tribesman',
	'knight',
	'rogue',
	'skeleton',
	'soldier',
	'witch',
	'wizard',
	'zombie'
]

const emotes = [
	'combat-emote',
	'arrow-bottom-emote',
	'arrow-left-emote',
	'arrow-right-emote',
	'arrow-top-emote',
	'exclamation-emote',
	'question-emote',
	'sing-emote',
	'skull-emote',
	'sleep-emote',
	'sparkle-emote',
	'surprise-emote',
	'surprise2-emote',
	'sweat-emote',
	'v-hand-emote',
]

export function preload(this: Phaser.Scene) {
	["castle", "cave", "fort", "town", "tavern"].forEach(city => {
		this.load.image(city, `assets/cities/${city}.png`);
		this.load.image(`${city}_map`, `assets/cities/${city}_map.png`);

	});
	this.load.image("tilesets/pipoya", "assets/tilesets/pipoya.png");
	this.load.image("cursor", "assets/ui/selected_cursor.png");
	this.load.tilemapTiledJSON("maps/map1", "assets/maps/map1/mapdata.json");

	jobs.forEach(job => {
		this.load.spritesheet(
			job,
			`assets/jobs/${job}/sprites.png`,
			{
				frameWidth: 32,
				frameHeight: 32,
			}
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

	})

	//once all assets are loaded, create animations
	this.load.on("complete", () => {
		jobs.forEach(job => {
			//create animations
			this.anims.create({
				key: job + "-walk-down",
				frames: this.anims.generateFrameNumbers(job, { start: 0, end: 2 }),
				frameRate: 3,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-walk-left",
				frames: this.anims.generateFrameNumbers(job, { start: 3, end: 5 }),
				frameRate: 3,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-walk-right",
				frames: this.anims.generateFrameNumbers(job, { start: 6, end: 8 }),
				frameRate: 3,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-walk-up",
				frames: this.anims.generateFrameNumbers(job, { start: 9, end: 11 }),
				frameRate: 3,
				repeat: -1,
			});


		})

		emotes.forEach(emote => {
			this.anims.create({
				key: emote,
				frames: this.anims.generateFrameNumbers(emote, { start: 0, end: 2 }),
				frameRate: 3,
				repeat: -1,
			});
		});
	});

}
