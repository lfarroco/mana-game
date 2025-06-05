import { getState } from "../../../Models/State";
import { Chara } from "../../../Systems/Chara/Chara";
import * as Flyout_ from "../../../Systems/Flyout";
import * as constants from "../constants";
import { coinDropIO } from "./UIManager";
import { updatePlayerGoldIO } from "../../../Models/Force";
import { images } from "../../../assets";

export const CHEST_TILE_SIZE = constants.TILE_WIDTH / 2;

export let sellImage: Phaser.GameObjects.Image | null = null;

let initialized = false;

// Event handler for unit sell
function onUnitSell(chara: Chara) {
	const state = getState();
	const unit = chara.unit;
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);
	state.battleData.units = state.battleData.units.filter(u => u.id !== unit.id);
	chara.container.destroy();
	coinDropIO(10, 10, chara.container.x, chara.container.y);
	updatePlayerGoldIO(10);
}

export async function renderGuildButton(sceneRef: Phaser.Scene) {
	const flyout = await Flyout_.create(sceneRef, "Your Guild")
	const container = sceneRef.add.container(0, 0);
	flyout.add(container);

	// Store references for event handlers in module scope

	sceneRef.add.image(
		...[
			constants.SCREEN_WIDTH - 120,
			constants.SCREEN_HEIGHT - 560
		],
		images.guild.key)
		.setOrigin(0.5)
		.setDisplaySize(230, 230)
		.setInteractive()
		.on("pointerup", () => handleButtonClicked(container, flyout)());

	if (initialized) return;

	// Register event handlers only once
	sceneRef.events.on("unitSell", onUnitSell);

	initialized = true;

}

const handleButtonClicked = (container: Container, flyout: Flyout_.Flyout) => async () => {
	if (flyout.isOpen) {
		flyout.slideOut();
		return;
	}
	render(container.scene, container);
	await flyout.slideIn();
}

export function render(scene: Scene, parent: Container) {

	parent.removeAll(true);

	sellImage = sellZone(scene, parent);

}

function sellZone(scene: Scene, parent: Container) {

	const sellImage = scene.add.image(
		400, constants.SCREEN_HEIGHT - 150,
		"icon/sell"
	)
		.setDisplaySize(400, 250)

	const sellText = scene.add.text(
		400, constants.SCREEN_HEIGHT - 150,
		"Sell",
		constants.defaultTextConfig,
	)
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14)
		;

	parent.add([sellImage, sellText]);

	return sellImage

}
