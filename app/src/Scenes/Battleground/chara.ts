import Phaser from "phaser";
import { Squad } from "../../Models/Squad";

export function chara(
	x: number,
	y: number,
	scene: Phaser.Scene,
	squad: Squad,
) {
	const spineboy: Phaser.GameObjects.Image = scene
		//@ts-ignore
		.add.spine(x, y, "spine-data", "spine-atlas");
	spineboy.scale = 0.1;

	//@ts-ignore
	spineboy.skeleton.setSkinByName("archer");
	//@ts-ignore
	spineboy.animationState.setAnimation(0, "map-idle", true);
	spineboy.setName("spine-" + squad.id)

	// create a red circle
	const circle = new Phaser.Geom.Circle(0, 0, 20);
	const body = scene.add.graphics({ fillStyle: { color: 16711680 } });
	body.fillCircleShape(circle);
	body.setAlpha(0.5);
	body.setPosition(x, y);
	body.setName("body-" + squad.id)
	circle.setPosition(x, y)

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
