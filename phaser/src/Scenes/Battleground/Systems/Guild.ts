import { getState } from "../../../Models/State";
import { Chara } from "../../../Systems/Chara/Chara";
import { Flyout } from "../../../Systems/Flyout";
import * as constants from "../constants";
import { updatePlayerGoldIO } from "../../../Models/Force";
import { images } from "../../../assets";

import { BattlegroundScene } from "../BattlegroundScene"; // Assuming this is your actual scene class
interface BattlegroundSceneWithUIManager extends BattlegroundScene {
	uiManager: import('./UIManager').UIManager; // Adjust path as needed
}

export const CHEST_TILE_SIZE = constants.TILE_WIDTH / 2;

export let sellImage: Phaser.GameObjects.Image | null = null;

let initialized = false;

// Event handler for unit sell
function onUnitSell(chara: Chara) {
	const state = getState();
	const unit = chara.unit;
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);
	state.battleData.units = state.battleData.units.filter(u => u.id !== unit.id);
	chara.destroy();
	(chara.parent as BattlegroundSceneWithUIManager).uiManager.coinDropIO(10, 10, chara.x, chara.y);
	updatePlayerGoldIO(chara.parent, 10);
}

export async function renderGuildButton(sceneRef: BattlegroundSceneWithUIManager) {
	const flyout = new Flyout(sceneRef, "Your Guild")
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

const handleButtonClicked = (container: Container, flyout: Flyout) => async () => {
	if (flyout.isOpen) {
		flyout.slideOut();
		return;
	}
	render(container.parent, container);
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
