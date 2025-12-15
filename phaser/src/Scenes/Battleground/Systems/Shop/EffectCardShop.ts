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

export async function openUpgradeCorePhase(availableEncounters: string[]): Promise<void> {
	return new Promise<void>(async (resolve) => {
		const container = io.Container();

		const encounters = pickRandom(availableEncounters, 3);

		const completeSectionCallback = async () => {
			await ShopPanel.slideOut();
			container.destroy();
			resolve();
		};

		ShopPanel.create(completeSectionCallback);

		renderUpgradeCards(container, encounters, async () => {
			container.list.forEach((child) => child.disableInteractive());
			await delay(500);
			completeSectionCallback();
		});

		Board.setEnemyBoardVisible(false);

		await ShopPanel.slideIn();
	});
}


function renderUpgradeCards(
	container: Container,
	encounterIds: string[],
	onUpgradeSelected: () => void | Promise<void>
) {
	const state = getState();

	const coreUnit = state.gameData.player.units.find((u) => u.isCore)!;

	encounterIds.forEach((encounterId, index) => {
		const encounterSpec = orbsIndex[encounterId]();

		const width = 700;
		const height = 220;
		const spacing = 240;

		const x = SCREEN_WIDTH - 450;
		const y = 300 + index * spacing;

		createEncounterCard(container, {
			x,
			y,
			width,
			height,
			name: encounterSpec.name,
			pic: encounterSpec.icon,
			description: encounterSpec.tooltip,
			onClick: async () => {
				console.log(`Selected upgrade: ${encounterSpec.name}`);

				const applied = encounterSpec.effect(coreUnit);
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
