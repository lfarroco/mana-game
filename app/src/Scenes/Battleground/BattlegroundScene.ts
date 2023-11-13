import Phaser from "phaser"


class BattlegroundScene extends Phaser.Scene {
	constructor() {
		super("BattlegroundScene")
	}

	preload = preload
	create = create
	update = update
}

function preload(this: Phaser.Scene) {

	this.load.image('tilesets/pipoya', 'assets/tilesets/pipoya.png');
	this.load.tilemapTiledJSON('maps/map1', 'assets/maps/map1/mapdata.json');

	this.load.spritesheet('jobs/wizard', 'assets/jobs/wizard/sprites.png', { frameWidth: 32, frameHeight: 32 });

}

function create(this: Phaser.Scene) {
	console.log("hello there")

	const map = this.make.tilemap({ key: 'maps/map1' });

	const tiles = map.addTilesetImage('tilesets/pipoya', 'tilesets/pipoya');

	if (!tiles) {
		console.error("tiles is null")
		return
	}

	map.createLayer(0, tiles);
	map.createLayer(1, tiles);
	map.createLayer(2, tiles);

	const units = [
		{ id: "1", job: "wizard" }
	]

	// add animations

	this.anims.create({
		key: 'walk',
		frames: this.anims.generateFrameNumbers('jobs/wizard', { start: 0, end: 2 }),
		frameRate: 10,
		repeat: -1
	});

	units.forEach(unit => {

		this.add.sprite(100, 100, `jobs/${unit.job}`, 0).play(`walk`)
	})


}

function update() { }

export default BattlegroundScene