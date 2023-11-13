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

	//@ts-ignore
	this.load.spineBinary("spine-data", "assets/spine/_base/skeleton.skel");
	//@ts-ignore
	this.load.spineAtlas("spine-atlas", "assets/spine/_base/skeleton.atlas");

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
		{ id: "1", job: "barbarian" }
	]

	// add animations

	units.forEach(unit => {

		//@ts-ignore
		const spineboy = this.add.spine(400, 500, 'spine-data', "spine-atlas");
		spineboy.scale = 0.1;
		spineboy.skeleton.setSkinByName('archer')
		spineboy.animationState.setAnimation(0, "map-idle", true);
	})


}

function update() { }

export default BattlegroundScene