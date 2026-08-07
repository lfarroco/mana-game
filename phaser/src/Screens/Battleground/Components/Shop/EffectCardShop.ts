import * as Board from "@Components/Board/Board";
import * as OrbPresentation from "@Screens/Battleground/Components/Shop/OrbPresentation";
import * as constants from "@Constants";
import * as EncounterCard from "@Components/EncounterCard";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";
import { BGContext, dispatchAction } from "../../BattlegroundScreen";
import { skipButton } from "../skipButton";

// Effect card shop constants (same as Encounter display)
//const EFFECT_CARD_COMPLETION_DELAY_MS = 300;
const EFFECT_CARD_WIDTH = 700;
const EFFECT_CARD_HEIGHT = 220;
const EFFECT_CARD_SPACING = 240;
const EFFECT_CARD_X_OFFSET = 450;
const EFFECT_CARD_BASE_Y = 300;

export const openUpgradeCorePhase = (_ctx: BGContext) => (
	titleText: string,
	encounters: string[],
) => {

	const title = env.scene.add.text(constants.SCREEN_WIDTH / 2 + 180, 130, i18n.t(titleText), constants.titleTextConfig).setOrigin(0.5);

	const skipButton_ = skipButton();

	const cards = renderUpgradeCards(encounters);

	Board.setEnemyBoardVisible(false);


	return [title, ...cards, skipButton_]

}

function renderUpgradeCards(
	encounterIds: string[],
) {
	let isResolvingSelection = false;

	return encounterIds.map((encounterId, index) => {
		console.debug("EffectCardShop", "Rendering upgrade card for encounter:", encounterId);
		const encounterSpec = OrbPresentation.getOrbPresentation(encounterId);

		const width = EFFECT_CARD_WIDTH;
		const height = EFFECT_CARD_HEIGHT;
		const spacing = EFFECT_CARD_SPACING;

		const x = constants.SCREEN_WIDTH - EFFECT_CARD_X_OFFSET;
		const y = EFFECT_CARD_BASE_Y + index * spacing;

		return EncounterCard.createEncounterCard({
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
				console.debug("EffectCardShop", `Selected upgrade: ${encounterSpec.name}`);

				await dispatchAction({ type: "select_encounter", encounterId });


				// TODO: post-upgrade visuals (crystal selection effect, core refresh, sound) are not yet wired.
				// The upgrade is applied server-side via advancePhase; the client should react to the
				// resulting session update to refresh visuals and play effects.

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
