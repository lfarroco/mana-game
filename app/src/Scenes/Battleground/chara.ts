import Phaser from "phaser";

export function chara(x: number, y: number, scene: Phaser.Scene) {
	//@ts-ignore
	const spineboy = scene.add.spine(x, y, "spine-data", "spine-atlas");
	spineboy.scale = 0.1;
	spineboy.skeleton.setSkinByName("archer");
	spineboy.animationState.setAnimation(0, "map-idle", true);

	// create a red circle
	const circle = new Phaser.Geom.Circle(x, y, 20);
	const graphics = scene.add.graphics({ fillStyle: { color: 16711680 } });
	graphics.fillCircleShape(circle);
	graphics.setAlpha(0.5);
	graphics.setPosition(x, y);

	const follow = () => {

		spineboy.x = circle.x;
		spineboy.y = circle.y;
	};

	//todo: iterate on scene state, for each chara, make it follow its circle

	//make spineboy follow circle
	scene.events.on("update", follow);
	//destroy listener on element destroy
	spineboy.once("destroy", () => {
		scene.events.off("update", follow);
	});
}
