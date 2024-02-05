import Phaser from "phaser";

const jobs = [
	'archer',
	'monk',
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

	jobs.forEach(job => {
		this.load.spritesheet(
			job,
			`assets/jobs/${job}/sprites.png`,
			{
				frameWidth: 64,
				frameHeight: 64,
			}
		);
		this.load.spritesheet(
			`${job}-attack`,
			`assets/jobs/${job}/sprites.png`,
			{
				frameWidth: 64 * 3,
				frameHeight: 64 * 3,
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

		const cols = 18

		const frameRate = 9

		const walkRow = 8
		const walkUpRow = walkRow
		const walkLeftRow = walkRow + 1
		const walkDownRow = walkRow + 2
		const walkRightRow = walkRow + 3
		const walkFrames = 8

		const slashRow = 9
		const slashUpRow = slashRow
		const slashLeftRow = slashRow + 1
		const slashDownRow = slashRow + 2
		const slashRightRow = slashRow + 3
		const slashFrames = 5

		//animations:
		// 4 cast
		// 4 pierce
		// 4 walk
		// 4 slash
		// 4 shoot
		// 1 die

		jobs.forEach(job => {
			//create animations
			this.anims.create({
				key: job + "-walk-down",
				frames: this.anims.generateFrameNumbers(job, {
					start: 1 + walkDownRow * cols,
					end: walkDownRow * cols + walkFrames
				}),
				frameRate,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-walk-left",
				frames: this.anims.generateFrameNumbers(job, {
					start: walkLeftRow * cols,
					end: walkLeftRow * cols + walkFrames
				}),
				frameRate,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-walk-right",
				frames: this.anims.generateFrameNumbers(job, {

					start: walkRightRow * cols,
					end: walkRightRow * cols + walkFrames
				}),
				frameRate,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-walk-up",
				frames: this.anims.generateFrameNumbers(job, {
					start: 1 + walkUpRow * cols,
					end: walkUpRow * cols + walkFrames
				}),
				frameRate,
				repeat: -1,
			});

			this.anims.create({
				key: job + "-slash-down",
				frames: this.anims.generateFrameNumbers(`${job}-attack`, {
					start: slashDownRow * slashFrames,
					end: slashDownRow * slashFrames + slashFrames - 1,
				}),
				frameRate: 3,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-slash-left",
				frames: this.anims.generateFrameNumbers(`${job}-attack`, {
					start: slashLeftRow * slashFrames,
					end: slashLeftRow * slashFrames + slashFrames - 1
				}),
				frameRate: 3,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-slash-right",
				frames: this.anims.generateFrameNumbers(`${job}-attack`, {
					start: slashRightRow * slashFrames,
					end: slashRightRow * slashFrames + slashFrames - 1
				}),
				frameRate: 3,
				repeat: -1,
			});
			this.anims.create({
				key: job + "-slash-up",
				frames: this.anims.generateFrameNumbers(`${job}-attack`, {
					start: slashUpRow * slashFrames,
					end: slashUpRow * slashFrames + slashFrames - 1
				}),
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
