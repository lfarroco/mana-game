import { getState } from "../../../Models/State";
import { Chara } from "../../../Systems/Chara/Chara";
import * as Flyout_ from "../../../Systems/Flyout";
import * as constants from "../constants";
import { destroyChara, summonChara } from "./CharaManager";
import { coinDropIO } from "./UIManager";

import { Item } from "../../../Models/Item";
import { equipItemInBoardUnit } from "../../../Systems/Item/EquipItem";
import { Unit } from "../../../Models/Unit";
import { updatePlayerGoldIO } from "../../../Models/Force";
import { renderBench } from "./GuildBench";
import { renderVault } from "./GuildVault";

export const CHEST_TILE_SIZE = constants.TILE_WIDTH / 2;

export let sellImage: Phaser.GameObjects.Image | null = null;

let initialized = false;

// Module-scoped variable for flyout and container
let guildFlyout: Flyout_.Flyout | null = null;
let flyoutContainer: Container | null = null;

// Event handler for unit dropped in bench slot
function onUnitDroppedInBenchSlot(unit: Unit, index: number) {
	const state = getState();
	const slot = state.gameData.player.bench[index];
	const occupier = slot && slot.unit;
	if (occupier) {
		occupier.position = unit.position;
		state.gameData.player.units.push(occupier);
		summonChara(occupier, true);
	}
	state.gameData.player.bench[index] = { index, unit };
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);
	state.battleData.units = state.battleData.units.filter(u => u.id !== unit.id);
	destroyChara(unit.id);

	// Rerender the flyout contents if open
	if (!guildFlyout) return;

	const { scene, isOpen } = guildFlyout;
	if (isOpen && flyoutContainer) {
		render(scene, flyoutContainer);
	}
}

// Event handler for unit sell
function onUnitSell(chara: Chara) {
	const state = getState();
	const unit = chara.unit;
	state.gameData.player.units = state.gameData.player.units.filter(u => u.id !== unit.id);
	state.battleData.units = state.battleData.units.filter(u => u.id !== unit.id);
	const benchIndex = state.gameData.player.bench.findIndex(b => b.unit && b.unit.id === unit.id);
	if (benchIndex !== -1) {
		state.gameData.player.bench[benchIndex] = { index: benchIndex, unit: null };
	}
	chara.container.destroy();
	coinDropIO(10, 10, chara.container.x, chara.container.y);
	updatePlayerGoldIO(10);
}

// Event handler for item sell
export function onItemSell(icon: Phaser.GameObjects.Image, item: Item) {
	const state = getState();
	icon.destroy();
	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);
	coinDropIO(item.cost / 2, item.cost / 2, icon.x, icon.y);
	updatePlayerGoldIO(item.cost / 2);
}

// Event handler for item dropped on chara
function onItemDroppedOnChara(targetChara: Chara, icon: Phaser.GameObjects.Image, item: Item) {
	const state = getState();
	icon.destroy();
	const currentItem = targetChara.unit.equip;
	equipItemInBoardUnit({ chara: targetChara, item });
	state.gameData.player.items = state.gameData.player.items.filter(i => i?.id !== item.id);
	if (currentItem !== null) {
		state.gameData.player.items.push(currentItem);
	}
}

export async function renderGuildButton(scene: Phaser.Scene) {
	const flyout = await Flyout_.create(scene, "Your Guild")
	const container = scene.add.container(0, 0);
	flyout.add(container);

	// Store references for event handlers in module scope
	guildFlyout = flyout;
	flyoutContainer = container;

	scene.add.image(
		...[
			constants.SCREEN_WIDTH - 120,
			constants.SCREEN_HEIGHT - 560
		],
		"ui/guild")
		.setOrigin(0.5)
		.setDisplaySize(230, 230)
		.setInteractive()
		.on("pointerup", () => handleButtonClicked(container, flyout)());

	if (initialized) return;
	// Register event handlers only once
	scene.events.on("unitDroppedInBenchSlot", onUnitDroppedInBenchSlot);
	scene.events.on("unitSell", onUnitSell);
	scene.events.on("itemSell", onItemSell);
	scene.events.on("itemDroppedOnChara", onItemDroppedOnChara);
	scene.events.on("itemDroppedOnBenchChara", onItemDroppedOnChara);

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

	const state = getState();

	parent.removeAll(true);

	sellImage = sellZone(scene, parent);

	const benchSlots = renderBench(scene, parent, state);

	renderVault(scene, parent, state, sellImage, benchSlots);


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
