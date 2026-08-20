import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as theme from "@Screens/Battleground/Components/UI/theme";
import { env } from "@Env";
import type { MultiplayerVictoryCounts } from "../../../RemoteServer";

const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 420;

/** Tier display colors (match ResultsConfig.RESULTS_COLORS). */
const TIER_COLORS = {
	gold: "#FFD700",
	silver: "#C0C0C0",
	bronze: "#CD7F32",
} as const;

/**
 * Victory-stats panel — a header plus gold/silver/bronze rows with colored
 * values. Used twice by the lobby (career + season).
 */
export function create(config: {
	title: string;
	counts: MultiplayerVictoryCounts;
	position: [number, number];
}): Phaser.GameObjects.Container {
	const [x, y] = config.position;

	const bg = env.borderedRoundRect(
		[x, y],
		[PANEL_WIDTH, PANEL_HEIGHT],
		20,
		theme.UI_SURFACE_COLOR,
		theme.UI_SURFACE_ALPHA,
	);

	const header = env.scene.add
		.text(x, y - PANEL_HEIGHT / 2 + 45, config.title, {
			...constants.titleTextConfig,
			fontSize: "24px",
			color: theme.UI_TEXT_LABEL,
		})
		.setOrigin(0.5);

	const rows: Array<{ label: string; value: number; color: string }> = [
		{ label: i18n.t("lobby.goldVictories"), value: config.counts.gold, color: TIER_COLORS.gold },
		{ label: i18n.t("lobby.silverVictories"), value: config.counts.silver, color: TIER_COLORS.silver },
		{ label: i18n.t("lobby.bronzeVictories"), value: config.counts.bronze, color: TIER_COLORS.bronze },
	];

	const startY = y - 75;
	const rowSpacing = 85;

	const texts: Phaser.GameObjects.Text[] = [];
	rows.forEach((row, index) => {
		const rowY = startY + index * rowSpacing;
		const labelText = env.scene.add
			.text(x - 70, rowY, row.label, {
				...constants.defaultTextConfig,
				fontSize: "24px",
				color: "#ecf0f1",
			})
			.setOrigin(0, 0.5);
		const valueText = env.scene.add
			.text(x + 70, rowY, row.value.toString(), {
				...constants.defaultTextConfig,
				fontSize: "30px",
				color: row.color,
				fontStyle: "bold",
			})
			.setOrigin(1, 0.5);
		texts.push(labelText, valueText);
	});

	return env.container([bg, header, ...texts]);
}
