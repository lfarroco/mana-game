import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as theme from "@Screens/Battleground/Components/UI/theme";
import * as UIButton from "@Components/Button/UIButton";
import { env } from "@Env";
import type { MultiplayerProfile } from "../../../RemoteServer";

/**
 * Rename affordance below the lobby profile panel: a "CHANGE NAME" button plus
 * a muted countdown hint when the 30-day cooldown applies (the server is the
 * authority — `profile.displayNameChange` comes from `GET /api/v1/players/me`).
 *
 * `update(profile)` re-syncs the button/hint state in place after a rename,
 * so the screen never has to destroy and rebuild the element.
 */
export type ChangeNameElement = {
	container: Phaser.GameObjects.Container;
	/** Re-sync the enabled state + countdown hint from a (fresh) profile. */
	update: (profile: MultiplayerProfile) => void;
};

export function create(
	profile: MultiplayerProfile,
	position: [number, number],
	onChangeName: () => void
): ChangeNameElement {
	const [x, y] = position;

	const button = UIButton.create({
		text: i18n.t("lobby.changeName"),
		position,
		width: 260,
		callback: onChangeName,
	});

	const hint = env.scene.add
		.text(x, y + 52, "", {
			...constants.defaultTextConfig,
			fontSize: "18px",
			color: theme.UI_TEXT_MUTED,
		})
		.setOrigin(0.5)
		.setWordWrapWidth(460, true);
	hint.setVisible(false);

	const container = env.container([button.container, hint]);

	const update = (next: MultiplayerProfile): void => {
		if (next.displayNameChange.allowed) {
			button.enable();
			hint.setVisible(false);
			return;
		}
		const nextAllowedAt = next.displayNameChange.nextAllowedAt;
		if (typeof nextAllowedAt === "number") {
			button.disable();
			const date = new Date(nextAllowedAt).toLocaleDateString();
			hint.setText(i18n.t("lobby.renameNextAllowed", { date }));
			hint.setVisible(true);
			return;
		}
		// Defensive: blocked without a timestamp — keep the button usable
		// rather than locking the player out of an attempt.
		button.enable();
		hint.setVisible(false);
	};

	update(profile);

	return { container, update };
}
