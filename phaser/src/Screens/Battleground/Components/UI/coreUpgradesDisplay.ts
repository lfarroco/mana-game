import * as Constants from "@Constants";
import * as PhaseConfig from "@game/PhaseSystem/PhaseConfig";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as i18n from "@i18n/i18n";
import { env, makeContainer as container } from "@Env";

/**
 * HUD chip counting the core-upgrade shops left in the run.
 *
 * Player report (2026-09-16): "having some kind of visual telling you how many
 * core 'reaction shops' you have left would be nice. Currently it just feels
 * like it randomly stops at some point. I think it's after 15 shops or
 * something."
 *
 * There are exactly `TOTAL_CORE_UPGRADE_WINDOWS` (15) `upgrade_core` /
 * `add_reaction_core` windows across rounds 1–15; Infinite mode (round 16+)
 * drops them entirely (see PhaseConfig.ROUND_PHASES). The countdown makes that
 * end visible instead of surprising.
 */
let countTextElement: Phaser.GameObjects.Text | null = null;
let currentRemaining = 0;

export const CORE_UPGRADES_DISPLAY_X = 470;
export const CORE_UPGRADES_DISPLAY_Y = 50;

/** Horizontal gap between the label and the count. */
const COUNT_OFFSET_X = 75;

export function create() {
	const initialRemaining = PhaseConfig.remainingCoreUpgradeWindows(
		env.state.session.round,
		env.state.session.step
	);
	currentRemaining = initialRemaining;

	const label = label_();
	const count = text(initialRemaining);

	const uiContainer = container([label, count]);
	uiContainer.setPosition(CORE_UPGRADES_DISPLAY_X, CORE_UPGRADES_DISPLAY_Y);

	const bounds = uiContainer.getBounds();
	uiContainer
		.setInteractive(
			new Phaser.Geom.Rectangle(0, -bounds.height / 2, bounds.width, bounds.height),
			Phaser.Geom.Rectangle.Contains
		)
		.on("pointerover", () => {
			Tooltip.renderTooltip(
				CORE_UPGRADES_DISPLAY_X + 100,
				CORE_UPGRADES_DISPLAY_Y + 200,
				i18n.t("coreUpgradesDisplay.title"),
				i18n.t("coreUpgradesDisplay.description")
			);
		})
		.on("pointerout", () => {
			Tooltip.hideTooltip();
		});

	return uiContainer;
}

export const getCurrentRemaining = (): number => currentRemaining;

export const updateCoreUpgradesDisplay = (newRemaining: number): void => {
	if (!countTextElement) {
		return;
	}

	currentRemaining = newRemaining;
	countTextElement.setText(newRemaining.toString());
};

function text(initialRemaining: number) {
	countTextElement = env.scene.add.text(0, 0, initialRemaining.toString(), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	countTextElement.setPosition(COUNT_OFFSET_X, 0);
	countTextElement.setOrigin(0, 0.5);

	return countTextElement;
}

function label_() {
	const label = env.scene.add.text(0, 0, i18n.t("ui.coreUpgrades"), {
		...Constants.titleTextConfig,
		fontSize: "24px",
		color: "#ffffff",
	});
	label.setOrigin(0, 0.5);
	return label;
}
