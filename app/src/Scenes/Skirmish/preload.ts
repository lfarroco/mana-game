import Phaser from "phaser";

export function preload(this: Phaser.Scene) {
	["bgs/castle", "bgs/forest"].forEach(bg => {
		this.load.image(bg, `assets/${bg}.jpeg`);

	});
	//@ts-ignore
	this.load.spineBinary("spine-data", "assets/spine/_base/skeleton.skel");
	//@ts-ignore
	this.load.spineAtlas("spine-atlas", "assets/spine/_base/skeleton.atlas");
}
