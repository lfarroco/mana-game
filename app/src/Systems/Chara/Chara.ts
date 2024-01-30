import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { BAR_HEIGHT, BAR_WIDTH, BORDER_WIDTH } from "./StaminaBar";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Sprite,
	emote: Phaser.GameObjects.Sprite | null,
	staminaBar: Phaser.GameObjects.Graphics | null,
	staminaBarBackground: Phaser.GameObjects.Graphics | null,
	group: Phaser.GameObjects.Group | null,
	movementArrow: Phaser.GameObjects.Sprite | null,
	movementArrowOverlay: Phaser.GameObjects.Sprite | null
}

export const CHARA_SCALE = 1;
export const EMOTE_SCALE = 1;

export function createChara(
	scene: BattlegroundScene,
	squad: Unit,
): Chara {

	const sprite = createSprite(scene, squad);

	//stamina bar

	const staminaBackground = scene.add.graphics();
	staminaBackground.fillStyle(0x000000, 1);
	staminaBackground.fillRect(
		0,
		0,
		BAR_WIDTH,
		BAR_HEIGHT
	);
	const staminaBar = scene.add.graphics();
	staminaBar.fillStyle(0xffff00, 1);
	staminaBar.fillRect(
		0,
		0,
		BAR_WIDTH - BORDER_WIDTH * 2,
		BAR_HEIGHT - BORDER_WIDTH * 2
	);

	const follow = () => {
		staminaBackground.x = sprite.x - BAR_WIDTH / 2;
		staminaBackground.y = sprite.y + HALF_TILE_HEIGHT - BAR_HEIGHT * 2;
		staminaBar.x = staminaBackground.x + BORDER_WIDTH;
		staminaBar.y = staminaBackground.y + BORDER_WIDTH
	};

	//make bars follow sprite
	scene.events.on("update", follow);
	//destroy listener on element destroy
	sprite.once("destroy", () => {
		scene.events.off("update", follow);
	});

	const group = scene.add.group([sprite, staminaBackground, staminaBar])

	const chara: Chara = {
		id: squad.id,
		force: squad.force,
		job: squad.job,
		sprite,
		emote: null,
		staminaBar,
		staminaBarBackground: staminaBackground,
		group,
		movementArrow: null,
		movementArrowOverlay: null
	}

	return chara
}

function createSprite(scene: BattlegroundScene, squad: Unit) {

	const sprite = scene
		.add.sprite(
			squad.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
			squad.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
			squad.job
		)

	sprite.play(squad.job + "-walk-down", true);
	sprite.setName("chara-" + squad.id);
	return sprite;
}

