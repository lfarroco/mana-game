import Phaser from "phaser";
import { Squad, getMembers } from "../../Models/Squad";
import { Unit } from "../../Models/Unit";

export type Chara = {
	id: string;
	force: string;
	body: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
}

export function chara(
	scene: Phaser.Scene,
	squad: Squad,
) {

	const [leader] = getMembers(squad)

	if (!leader) throw new Error("No leader in squad")

	const spine: Phaser.GameObjects.Image = createSpineBody(scene, leader, squad);

	const body = scene.physics.add.image(
		squad.position.x,
		squad.position.y,
		"")
	body.setSize(20, 20)
	body.setName(squad.id)

	const follow = () => {
		spine.x = body.x;
		spine.y = body.y;
	};

	//todo: iterate on scene state, for each chara, make it follow its circle

	//make spineboy follow circle
	scene.events.on("update", follow);
	//destroy listener on element destroy
	spine.once("destroy", () => {
		scene.events.off("update", follow);
	});

	return {
		id: squad.id,
		force: squad.force,
		body,
		spineboy: spine,
	}
}
function createSpineBody(scene: Phaser.Scene, leader: Unit, squad: Squad) {
	const spine: Phaser.GameObjects.Image = scene
		//@ts-ignore
		.add.spine(squad.position.x, squad.position.y, "spine-data", "spine-atlas");
	spine.scale = 0.1;

	//@ts-ignore
	spine.skeleton.setSkinByName(leader.job);
	//@ts-ignore
	spine.animationState.setAnimation(0, "map-idle", true);
	spine.setName("spine-" + squad.id);
	return spine;
}

