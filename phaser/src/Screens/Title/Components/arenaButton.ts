import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as Modal from "@Components/Modal/Modal";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";
import { getScreenManager } from "../../ScreenManager";
import { isElectron } from "@Utils/environment";
import { steamAuth } from "@lib/steamAuth";
import { itchAuth } from "@lib/itchAuth";

const BUTTON_Y = 600;

/** Guards re-entry while a login / session check is in flight. */
let enteringMultiplayer = false;

export function create() {
	const label = i18n.t("title.multiplayer");
	const btn = UIButton.create({
		text: label,
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: () => {
			void enterMultiplayer(btn);
		},
		tooltip: {
			title: label,
			description: i18n.t("title.tooltip.multiplayer"),
			position: "right",
		},
	});

	return btn.container;
}

/**
 * Multiplayer entry (docs/itchio-auth.md Phase C): Electron uses the Steam
 * auto-login; the browser build uses the itch.io OAuth popup. After login the
 * player lands in the multiplayer lobby, which fetches the profile and drives
 * RESUME / NEW GAME (docs/multiplayer-lobby.md). Errors surface in a modal so
 * the player can fall back to single-player.
 */
async function enterMultiplayer(btn: UIButton.Button): Promise<void> {
	if (enteringMultiplayer) return;

	if (isElectron() && !steamAuth.isSteamAvailable()) {
		showMultiplayerMessage(i18n.t("title.multiplayer.requiresSteam"));
		return;
	}

	enteringMultiplayer = true;
	btn.disable();
	try {
		if (isElectron()) {
			await steamAuth.loginWithSteam();
		} else {
			// Browser build — itch.io OAuth. loginWithItch opens the popup
			// synchronously within this click gesture (popup-blocker
			// requirement, docs/itchio-auth.md C1).
			await itchAuth.loginWithItch();
		}

		// The lobby re-reads the persisted `{ token, player }` session written
		// by the login flow, so the login result itself is not needed here.
		void getScreenManager().go("multiplayer_lobby");
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		showMultiplayerMessage(`${i18n.t("title.multiplayer.loginFailed")}\n\n${detail}`);
	} finally {
		enteringMultiplayer = false;
		// After a successful login + navigation the button is destroyed by
		// screen teardown — only re-enable when it still exists.
		if (btn.container.scene) btn.enable();
	}
}

/** Small dismissible modal for multiplayer entry errors. */
function showMultiplayerMessage(message: string): void {
	const modal = Modal.createModal({
		width: 560,
		height: 320,
		title: i18n.t("title.multiplayer"),
	});

	const text = env.scene.add
		.text(0, -40, message, {
			...constants.defaultTextConfig,
			fontSize: "22px",
			color: "#ffffff",
			align: "center",
			wordWrap: { width: 480 },
		})
		.setOrigin(0.5);

	const okButton = UIButton.create({
		text: i18n.t("title.back"),
		position: [0, 110],
		width: 200,
		callback: () => {
			void modal.close();
		},
	});

	modal.container.add([text, okButton.container]);
}
