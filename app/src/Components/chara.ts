import Phaser from "phaser";
import { Squad, getMembers } from "../Models/Squad";
import { Unit } from "../Models/Unit";
import { SpineGameObject } from "@esotericsoftware/spine-phaser";
import { TILE_HEIGHT } from "../Scenes/Battleground/constants";

export type Chara = {
	id: string;
	force: string;
	body: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	clickZone: Phaser.GameObjects.Zone;
	spine: SpineGameObject
}

export function createChara(
	scene: Phaser.Scene,
	squad: Squad,
): Chara {

	const [leader] = getMembers(squad)

	if (!leader) throw new Error("No leader in squad")

	const spine = createSpineBody(scene, leader, squad);

	const body = scene.add.zone(
		squad.position.x, squad.position.y,
		20, 20,
	)

	const clickZone = scene.add.zone(
		squad.position.x,
		squad.position.y - TILE_HEIGHT / 2,
		40, 80
	)
		.setInteractive();

	scene.physics.add.existing(body);

	const follow = () => {
		spine.x = body.x;
		spine.y = body.y;
		clickZone.x = body.x;
		clickZone.y = body.y - TILE_HEIGHT / 2;
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
		// phaser doesn't have a working type of a non-visible body, so we lie here
		//@ts-ignore
		body,
		clickZone,
		spine,
	}
}
function createSpineBody(scene: Phaser.Scene, leader: Unit, squad: Squad) {

	// todo: check docs: https://photonstorm.github.io/phaser3-docs/SpineGameObject.html
	//If your Spine Game Object has black outlines around the different parts of the texture when it renders then you have exported the files from Spine with pre-multiplied alpha enabled, but have forgotten to set that flag when loading the Spine data. Please see the loader docs for more details.

	const spine: SpineGameObject = scene
		.add.spine(squad.position.x, squad.position.y, "spine-data", "spine-atlas")
	spine.scale = 0.1;

	spine.skeleton.setSkinByName(leader.job);
	spine.animationState.setAnimation(0, "map-idle", true);
	spine.setName("spine-" + squad.id);
	return spine;
}

