import Phaser from "phaser";

export function preload(this: Phaser.Scene) {
	["bgs/castle", "bgs/forest"].forEach(bg => {
		this.load.image(bg, `assets/${bg}.jpeg`);

	});
}
