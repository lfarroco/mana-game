import * as ShopPanel from "./ShopPanel";
import * as Board from "@Models/Board";
import { delay } from "@Utils/animation";
import { pickRandom } from "../../../../utils";
import { getState } from "@Models/State";
import { orbsIndex } from "./Orbs";
import * as io from "@PhaserIO";
import { SCREEN_WIDTH } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createEncounterCard } from "../Components/EncounterCard";

export async function openUpgradeCorePhase(orbs: string[]): Promise<void> {
	return new Promise<void>(async (resolve) => {
		const container = io.Container();

		const selectedOrbs = pickRandom(orbs, 3);

		const completeSectionCallback = async () => {
			await ShopPanel.slideOut();
			container.destroy();
			resolve();
		};

		ShopPanel.create(completeSectionCallback);

		renderUpgradeCards(container, selectedOrbs, async () => {
			container.list.forEach((child) => child.disableInteractive());
			await delay(500);
			completeSectionCallback();
		});

		Board.setEnemyBoardVisible(false);

		await ShopPanel.slideIn();
	});
}


function renderUpgradeCards(
	container: Phaser.GameObjects.Container,
	orbIds: string[],
	onUpgradeSelected: () => void | Promise<void>
) {
	const state = getState();

	const coreUnit = state.gameData.player.units.find((u) => u.isCore);
	if (!coreUnit) {
		console.error("No core unit found for player!");
		return;
	}

	orbIds.forEach((orbId, index) => {
		const orbSpec = orbsIndex[orbId]();

		const width = 700;
		const height = 220;
		const spacing = 240;

		// Align with Encounter.ts
		const x = SCREEN_WIDTH - 450;
		const y = 300 + index * spacing;

		createEncounterCard(container, {
			x,
			y,
			width,
			height,
			name: orbSpec.name,
			pic: orbSpec.icon,
			description: orbSpec.tooltip,
			onClick: async () => {
				console.log(`Selected upgrade: ${orbSpec.name}`);

				const applied = orbSpec.effect(coreUnit);
				if (applied) {
					playSoundEffect('sfx_spell_deathstrikeseal');
					await onUpgradeSelected();
				} else {
					console.warn("Upgrade failed to apply (conditions not met?)");
				}
			}
		});

	});

}
