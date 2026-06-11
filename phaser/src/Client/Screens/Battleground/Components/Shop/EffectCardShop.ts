import * as ShopPanel from "@Screens/Battleground/Components/Shop/ShopPanel";
import * as Board from "@Models/Board";
import * as Orbs from "@Screens/Battleground/Components/Shop/Orbs";
import * as constants from "@Constants";
import * as EncounterCard from "@Systems/Components/EncounterCard";
import * as i18n from "@i18n/i18n";
import * as GameController from "@Core/GameController";
import * as Logger from "@Utils/Logger";

const logger = Logger.createLogger("EffectCardShop");

// Effect card shop constants (same as Encounter display)
//const EFFECT_CARD_COMPLETION_DELAY_MS = 300;
const EFFECT_CARD_WIDTH = 700;
const EFFECT_CARD_HEIGHT = 220;
const EFFECT_CARD_SPACING = 240;
const EFFECT_CARD_X_OFFSET = 450;
const EFFECT_CARD_BASE_Y = 300;

export async function openUpgradeCorePhase(
	titleText: string,
	encounters: string[],
	// onSkip?: () => void | Promise<void>,
	// onUpgradeApplied?: (nextSession: Types.SessionData) => void | Promise<void>
): Promise<void> {
	return new Promise<void>(async () => {
		const container = io.Container();

		// const completeSectionCallback = async () => {
		// 	await ShopPanel.SlideOut();
		// 	// ShopPanel.slideOut() calls removeAll(true) which destroys all children,
		// 	// including the local container, so no explicit container.destroy() needed.
		// 	resolve();
		// };

		const title = io.Title1(i18n.t(titleText)).setPosition(constants.SCREEN_WIDTH / 2 + 180, 130);
		container.add(title);

		ShopPanel.addSkipButton();
		// 	async () => {
		// 		await onSkip();
		// 		await completeSectionCallback();
		// 	}
		// );

		// Add the local container to ShopPanel so it participates in slide-in/out animations.
		ShopPanel.add(container);

		renderUpgradeCards(container, encounters,
			//onUpgradeApplied, 
			// async () => { container.list.forEach((child) => child.disableInteractive());
			//await animation.delay(EFFECT_CARD_COMPLETION_DELAY_MS); completeSectionCallback();
		);

		Board.setEnemyBoardVisible(false);

		await ShopPanel.SlideIn();
	});

}

function renderUpgradeCards(
	container: Container,
	encounterIds: string[],
) {
	let isResolvingSelection = false;

	encounterIds.forEach((encounterId, index) => {
		logger.debug("Rendering upgrade card for encounter:", encounterId);
		const encounterSpec = Orbs.orbsIndex[encounterId]();

		const width = EFFECT_CARD_WIDTH;
		const height = EFFECT_CARD_HEIGHT;
		const spacing = EFFECT_CARD_SPACING;

		const x = constants.SCREEN_WIDTH - EFFECT_CARD_X_OFFSET;
		const y = EFFECT_CARD_BASE_Y + index * spacing;

		EncounterCard.createEncounterCard(container, {
			position: [x, y],
			size: [width, height],
			name: encounterSpec.name,
			pic: encounterSpec.icon,
			description: encounterSpec.tooltip,
			onClick: async () => {
				if (isResolvingSelection) {
					return;
				}

				isResolvingSelection = true;
				logger.debug(`Selected upgrade: ${encounterSpec.name}`);

				await GameController.selectEncounter(encounterId);


				// TODO: handle upgrade success (as event, before phase completion)

				// await onUpgradeApplied?.(success);

				// await Effects.playUpgradeCrystalSelectionEffect({
				// 	cardCenter: [x, y],
				// 	cardSize: [width, height],
				// 	cardObjects: card.allObjects,
				// 	accentColor: encounterSpec.color,
				// });

				// AudioManager.playSoundEffect("sfx_spell_deathstrikeseal");

				// // Sync updated unit data from server and refresh visuals.
				// // upgrade_core and add_reaction_core only modify the core unit,
				// // so only refresh the core to avoid re-summoning all board units.
				// for (const serverUnit of state.session.team.units) {
				// 	const localUnit = state.session.team.units.find(
				// 		(u) => u.id === serverUnit.id
				// 	);
				// 	if (localUnit) Object.assign(localUnit, serverUnit);
				// 	if (serverUnit.isCore) {
				// 		await Chara.refreshChara(localUnit ?? serverUnit);
				// 	}
				// }
				// ForceStats.syncPlayerPersistentForceStats();

				// await onUpgradeSelected();

			},
		});


	});

}
