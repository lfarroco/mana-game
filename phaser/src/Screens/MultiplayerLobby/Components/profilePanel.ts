import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as theme from "@Screens/Battleground/Components/UI/theme";
import { env } from "@Env";
import type { MultiplayerProfile } from "../../../RemoteServer";

const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 420;

/**
 * Profile panel — display name, provider badge, and current rating. Positioned
 * at the given center so the lobby can lay it out alongside the stat panels.
 *
 * `update(profile)` refreshes the name + rating in place after a rename
 * (the lobby keeps the panel alive and re-syncs it with the server's
 * response instead of rebuilding the element tree).
 */
export type ProfilePanelElement = {
	container: Phaser.GameObjects.Container;
	/** Re-sync the displayed name + rating from a (fresh) profile. */
	update: (profile: MultiplayerProfile) => void;
};

export function create(
	profile: MultiplayerProfile,
	position: [number, number]
): ProfilePanelElement {
	const [x, y] = position;

	const bg = env.borderedRoundRect(
		[x, y],
		[PANEL_WIDTH, PANEL_HEIGHT],
		20,
		theme.UI_SURFACE_COLOR,
		theme.UI_SURFACE_ALPHA
	);

	const header = env.scene.add
		.text(x, y - PANEL_HEIGHT / 2 + 45, i18n.t("lobby.profile"), {
			...constants.titleTextConfig,
			fontSize: "24px",
			color: theme.UI_TEXT_LABEL,
		})
		.setOrigin(0.5);

	const name = env.scene.add
		.text(x, y - 80, "", {
			...constants.titleTextConfig,
			fontSize: "44px",
			color: theme.UI_TEXT_ACCENT,
		})
		.setOrigin(0.5)
		.setWordWrapWidth(PANEL_WIDTH - 80, true);

	const providerLabel = env.scene.add
		.text(x, y - 10, i18n.t(`lobby.provider.${profile.player.provider}`), {
			...constants.defaultTextConfig,
			fontSize: "20px",
			color: theme.UI_TEXT_MUTED,
		})
		.setOrigin(0.5);

	const divider = env.scene.add.rectangle(x, y + 40, PANEL_WIDTH - 160, 2, 0xffffff, 0.15);

	const ratingLabel = env.scene.add
		.text(x, y + 80, i18n.t("lobby.rating"), {
			...constants.defaultTextConfig,
			fontSize: "22px",
			color: theme.UI_TEXT_LABEL,
		})
		.setOrigin(0.5);

	const rating = env.scene.add
		.text(x, y + 135, "", {
			...constants.titleTextConfig,
			fontSize: "40px",
			color: "#FFD700",
		})
		.setOrigin(0.5);

	const container = env.container([bg, header, name, providerLabel, divider, ratingLabel, rating]);

	const update = (next: MultiplayerProfile): void => {
		const displayName =
			next.player.displayName && next.player.displayName.trim() !== ""
				? next.player.displayName
				: next.player.providerId;
		name.setText(displayName);
		rating.setText(next.rating.toString());
	};

	update(profile);

	return { container, update };
}
