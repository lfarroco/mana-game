import * as i18n from "@i18n/i18n";
import * as UIButton from "@Components/Button/UIButton";
import { env } from "@Env";
import type { MultiplayerProfile } from "../../../RemoteServer";

/**
 * Connect-account affordance below the lobby profile panel, shown INSTEAD of
 * the rename button for guest players (guests cannot rename — the server
 * rejects `PATCH /me` with `guest_cannot_rename`). The button opens the
 * connect modal (owned by the screen), where the player links an itch.io or
 * Google identity and becomes a regular player.
 *
 * The element intentionally has no `update()` (unlike `changeName`): after a
 * successful conversion the screen reloads through the title screen, which
 * rebuilds the lobby with the rename UI.
 */
export type ConnectAccountElement = {
	container: Phaser.GameObjects.Container;
};

export function create(
	_profile: MultiplayerProfile,
	position: [number, number],
	onConnectAccount: () => void
): ConnectAccountElement {
	const button = UIButton.create({
		text: i18n.t("lobby.connectAccount"),
		position,
		width: 320,
		callback: onConnectAccount,
		tooltip: {
			title: i18n.t("lobby.connectAccount"),
			description: i18n.t("lobby.connectBody"),
			position: "right",
		},
	});

	const container = env.container([button.container]);

	return { container };
}
