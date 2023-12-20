import Phaser from "phaser";
import { Squad, getMembers } from "../Models/Squad";
import { Unit } from "../Models/Unit";
import { TILE_HEIGHT, TILE_WIDTH } from "../Scenes/Battleground/constants";
import "./portrait.css"

export type Chara = {
	id: string;
	force: string;
	body: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	clickZone: Phaser.GameObjects.Zone;
	sprite: Phaser.GameObjects.Sprite
}

export const CHARA_SCALE_X = 2;

export function createChara(
	scene: Phaser.Scene,
	squad: Squad,
): Chara {

	const [leader] = getMembers(squad)

	if (!leader) throw new Error("No leader in squad")

	const sprite = createSprite(scene, leader, squad);

	const body = scene.physics.add.image(
		squad.position.x, squad.position.y, ""
	)
		.setName(squad.id)
		.setSize(TILE_WIDTH, TILE_HEIGHT)
		.setVisible(false)

	const clickZone = scene.add.zone(
		squad.position.x,
		squad.position.y,
		TILE_WIDTH, TILE_HEIGHT
	)
		.setInteractive();


	const follow = () => {
		sprite.x = body.x;
		sprite.y = body.y;
		clickZone.x = body.x;
		clickZone.y = body.y
	};

	//todo: iterate on scene state, for each chara, make it follow its circle

	//make spineboy follow circle
	scene.events.on("update", follow);
	//destroy listener on element destroy
	sprite.once("destroy", () => {
		scene.events.off("update", follow);
	});

	return {
		id: squad.id,
		force: squad.force,
		// phaser doesn't have a working type of a non-visible body, so we lie here
		//@ts-ignore
		body,
		clickZone,
		sprite: sprite,
	}
}
function createSprite(scene: Phaser.Scene, leader: Unit, squad: Squad) {

	const sprite = scene
		.add.sprite(squad.position.x, squad.position.y, leader.job)
	sprite.scale = CHARA_SCALE_X;

	sprite.play("walk-down", true);
	sprite.setName("chara-" + squad.id);
	return sprite;
}

