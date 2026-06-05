import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as PoisonDamageSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as c from "../../../../../Constants";
import * as MultiplayerManager from "@Multiplayer/MultiplayerManager";

const LEFT_MARGIN = 40;
const RIGHT_MARGIN = 40;
const BOTTOM_MARGIN = 28;
const DISPLAY_DEPTH = 1000;

let playerNameText: Phaser.GameObjects.Text | null = null;
let enemyNameText: Phaser.GameObjects.Text | null = null;

export const create = async () => {
	let forceStatsState = ForceStats.initializeForceStatsState();
	forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
	CombatSystemStates.setCombatSystemStates({
		poisonSystemState: PoisonDamageSystem.initializePoisonSystem(),
		regenSystemState: RegenSystem.initializeRegenSystem(),
		combatStatsTrackerState: CombatStatsTracker.initialize(state),
		forceStatsState,
	});

	if (!playerNameText || !playerNameText.scene) {
		playerNameText = createNameText(LEFT_MARGIN, "left");
	}

	if (!enemyNameText || !enemyNameText.scene) {
		enemyNameText = createNameText(c.SCREEN_WIDTH - RIGHT_MARGIN, "right");
	}

	const profile = await MultiplayerManager.getPlayerProfile(state.session.player_id);

	updateNameDisplay({
		playerName: profile.username,
		enemyName: "",
	});

}

const createNameText = (
	x: number,
	align: "left" | "right"
): Phaser.GameObjects.Text => {
	const text = io.scene.add.text(x, c.SCREEN_HEIGHT - BOTTOM_MARGIN, "", {
		...c.titleTextConfig,
		fontSize: "24px",
		strokeThickness: 10,
	});

	text.setDepth(DISPLAY_DEPTH);
	text.setOrigin(align === "left" ? 0 : 1, 1);
	text.setVisible(false);

	return text;
};

export const updateNameDisplay = ({
	playerName,
	enemyName,
}: {
	playerName?: string;
	enemyName?: string;
}): void => {
	if (playerNameText && playerName !== undefined) {
		playerNameText.setText(playerName);
		playerNameText.setVisible(playerName.trim().length > 0);
	}

	if (enemyNameText && enemyName !== undefined) {
		enemyNameText.setText(enemyName);
		enemyNameText.setVisible(enemyName.trim().length > 0);
	}
};
