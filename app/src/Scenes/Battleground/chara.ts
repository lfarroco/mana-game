import Phaser from "phaser";
import { Squad } from "../../Models/Squad";

export function chara(
	x: number,
	y: number,
	scene: Phaser.Scene,
	squad: Squad,
): Phaser.Types.Physics.Arcade.ImageWithDynamicBody {
	const spineboy: Phaser.GameObjects.Image = scene
		//@ts-ignore
		.add.spine(x, y, "spine-data", "spine-atlas");
	spineboy.scale = 0.1;

	//@ts-ignore
	spineboy.skeleton.setSkinByName("archer");
	//@ts-ignore
	spineboy.animationState.setAnimation(0, "map-idle", true);
	spineboy.setName("spine-" + squad.id)

	const body = scene.physics.add.image(x, y, "")
	body.setSize(20, 20)
	body.setPosition(x, y);
	body.setName("body-" + squad.id)
	body.setPosition(x, y)

	const follow = () => {
		spineboy.x = body.x;
		spineboy.y = body.y;
	};

	//todo: iterate on scene state, for each chara, make it follow its circle

	//make spineboy follow circle
	scene.events.on("update", follow);
	//destroy listener on element destroy
	spineboy.once("destroy", () => {
		scene.events.off("update", follow);
	});

	return body
}
