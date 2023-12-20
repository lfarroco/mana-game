import Phaser from "phaser";

export function preload(this: Phaser.Scene) {
	["castle", "cave", "fort", "town"].forEach(city => {
		this.load.image(city, `assets/cities/${city}.png`);
		this.load.image(`${city}_map`, `assets/cities/${city}_map.png`);

	});
	this.load.image("tilesets/pipoya", "assets/tilesets/pipoya.png");
	this.load.image("cursor", "assets/ui/selected_cursor.png");
	this.load.tilemapTiledJSON("maps/map1", "assets/maps/map1/mapdata.json");

	[
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
	].forEach(job => {
		this.load.spritesheet(
			job,
			`assets/jobs/${job}/sprites.png`,
			{
				frameWidth: 32,
				frameHeight: 32,
			}
		);
	})

	//once all assets are loaded, create animations
	this.load.on("complete", () => {
		//create animations
		this.anims.create({
			key: "walk-down",
			frames: this.anims.generateFrameNumbers("archer", { start: 0, end: 2 }),
			frameRate: 3,
			repeat: -1,
		});
		this.anims.create({
			key: "walk-left",
			frames: this.anims.generateFrameNumbers("archer", { start: 3, end: 5 }),
			frameRate: 3,
			repeat: -1,
		});
		this.anims.create({
			key: "walk-right",
			frames: this.anims.generateFrameNumbers("archer", { start: 6, end: 8 }),
			frameRate: 3,
			repeat: -1,
		});
		this.anims.create({
			key: "walk-up",
			frames: this.anims.generateFrameNumbers("archer", { start: 9, end: 11 }),
			frameRate: 3,
			repeat: -1,
		});
	});

}
