/**
 * MultiplayerLoginScene — the provider-choice screen as a raw Phaser scene.
 *
 * Fourth screen migrated off `@mana/framework` (see `Scenes/ScreenScene.ts`).
 * A single-view screen (no sub-phases): `buildScreen()` creates the whole
 * layout, `onScreenShutdown()` releases the module-level refs and the clouds
 * background that Phaser cannot know about.
 *
 *   [multiplayer button] → [login: Steam? / Google / itch.io / Guest / Log out / Back]
 *                        → [multiplayer lobby]
 *
 * Fresh Electron (Steam build) entries auto-log-in and skip this screen, but a
 * logged-out Steam player lands here with PLAY WITH STEAM on top so they can
 * re-enter via Steam or switch providers.
 */

import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Modal from "@Components/Modal/Modal";
import * as UIButton from "@Components/Button/UIButton";
import { env } from "@Env";
import { createEvent } from "@game/Models";
import { authSession } from "../../lib/authSession";
import { googleAuth } from "../../lib/googleAuth";
import { guestAuth } from "../../lib/guestAuth";
import { itchAuth } from "../../lib/itchAuth";
import { steamAuth } from "../../lib/steamAuth";
import { go } from "@Scenes/AppRouter";
import { ScreenScene } from "@Scenes/ScreenScene";
import * as cloudsBg from "../Title/Components/cloudsBg";

/** Phaser scene key — must match the route name (see Scenes/routes.ts). */
export const MULTIPLAYER_LOGIN_SCENE_KEY = "multiplayer_login";

const STEAM_Y = 460;
const GOOGLE_Y = 460;
const ITCH_Y = 560;
const GUEST_Y = 660;
const LOGOUT_Y = 760;
const BACK_Y = 860;
const STATUS_Y = 330;
/** Downward shift of every button below the Steam slot when it is shown. */
const STEAM_SHIFT = 100;

export type MultiplayerLoginEvents = {
	steamClicked: ReturnType<typeof createEvent<void>>;
	googleClicked: ReturnType<typeof createEvent<void>>;
	itchClicked: ReturnType<typeof createEvent<void>>;
	guestClicked: ReturnType<typeof createEvent<void>>;
	logoutClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
};

/** Guards re-entry while a login is in flight. */
let loggingIn = false;

/** Module refs for the auth-state UI, updated in place on logout. */
let statusText: Phaser.GameObjects.Text | null = null;
let logoutButton: UIButton.Button | null = null;

export class MultiplayerLoginScene extends ScreenScene {
	private disposers: (() => void)[] = [];

	constructor() {
		super({ key: MULTIPLAYER_LOGIN_SCENE_KEY });
	}

	protected buildScreen(): void {
		const events = createLoginEvents();
		this.disposers = [
			events.steamClicked.listen(() => {
				void enterWith(steamAuth.loginWithSteam);
			}),
			events.googleClicked.listen(() => {
				void enterWith(googleAuth.loginWithGoogle);
			}),
			events.itchClicked.listen(() => {
				void enterWith(itchAuth.loginWithItch);
			}),
			events.guestClicked.listen(() => {
				void enterWith(guestAuth.loginAsGuest);
			}),
			events.logoutClicked.listen(() => {
				authSession.clearSession();
				renderAuthState();
			}),
			events.backClicked.listen(() => {
				void go("title");
			}),
		];

		// The Steam slot sits above every other provider. When Steam is
		// unavailable (web/Android) the shift is 0 and the layout below is
		// exactly the old one.
		const showSteam = steamAuth.isSteamAvailable();
		const shift = showSteam ? STEAM_SHIFT : 0;

		cloudsBg.create();

		env.scene.add
			.text(constants.MIDDLE_SCREEN_X, 90, i18n.t("login.title"), constants.titleTextConfig)
			.setOrigin(0.5);

		// Signed-in state line — updated in place by logout.
		statusText = env.scene.add
			.text(constants.MIDDLE_SCREEN_X, STATUS_Y, "", constants.defaultTextConfig)
			.setOrigin(0.5)
			.setWordWrapWidth(900, true);

		// Steam re-entry — first slot, shown only when the Steam client is
		// present (Electron). A logged-out Steam player lands here from the
		// lobby and can re-enter via Steam or pick another provider below.
		if (showSteam) {
			UIButton.create({
				text: i18n.t("login.playWithSteam"),
				position: [constants.MIDDLE_SCREEN_X, STEAM_Y],
				width: 380,
				callback: () => {
					events.steamClicked.emit();
				},
				tooltip: {
					title: i18n.t("login.playWithSteam"),
					description: i18n.t("login.steamTooltip"),
					position: "right",
				},
			});
		}

		// Google sign-in — shown whenever a client id is baked into the build
		// (web + Android; hidden when unset so the button can't error).
		if (googleAuth.isConfigured()) {
			UIButton.create({
				text: i18n.t("login.signInGoogle"),
				position: [constants.MIDDLE_SCREEN_X, GOOGLE_Y + shift],
				width: 380,
				callback: () => {
					events.googleClicked.emit();
				},
				tooltip: {
					title: i18n.t("login.signInGoogle"),
					description: i18n.t("login.googleTooltip"),
					position: "right",
				},
			});
		}

		UIButton.create({
			text: i18n.t("login.signInItch"),
			position: [constants.MIDDLE_SCREEN_X, ITCH_Y + shift],
			width: 380,
			callback: () => {
				events.itchClicked.emit();
			},
		});

		// Guest play — no OAuth round-trip, the server assigns a random
		// handle. Always available (POST /auth/guest needs no provider).
		UIButton.create({
			text: i18n.t("login.playAsGuest"),
			position: [constants.MIDDLE_SCREEN_X, GUEST_Y + shift],
			width: 380,
			callback: () => {
				events.guestClicked.emit();
			},
			tooltip: {
				title: i18n.t("login.playAsGuest"),
				description: i18n.t("login.guestTooltip"),
				position: "right",
			},
		});

		UIButton.create({
			text: i18n.t("login.back"),
			position: [constants.MIDDLE_SCREEN_X, BACK_Y + shift],
			width: 380,
			callback: () => {
				events.backClicked.emit();
			},
		});

		// Logout button — only when a session exists. Destroyed in place when
		// the player logs out (scene shutdown destroys the rest).
		if (authSession.readStoredSession()) {
			logoutButton = UIButton.create({
				text: i18n.t("login.logOut"),
				position: [constants.MIDDLE_SCREEN_X, LOGOUT_Y + shift],
				width: 380,
				callback: () => {
					events.logoutClicked.emit();
				},
			});
		}

		renderAuthState();
	}

	protected onScreenShutdown(): void {
		this.disposers.forEach((dispose) => dispose());
		this.disposers = [];

		// Module-level refs survive the scene; Phaser destroyed the objects.
		statusText = null;
		logoutButton = null;
		loggingIn = false;
		cloudsBg.destroy();
	}
}

function createLoginEvents(): MultiplayerLoginEvents {
	return {
		steamClicked: createEvent<void>(),
		googleClicked: createEvent<void>(),
		itchClicked: createEvent<void>(),
		guestClicked: createEvent<void>(),
		logoutClicked: createEvent<void>(),
		backClicked: createEvent<void>(),
	};
}

/** Refresh the signed-in status line; hide the logout button when logged out. */
function renderAuthState(): void {
	const session = authSession.readStoredSession();

	if (!statusText) return;

	if (session) {
		const providerLabel = i18n.t(`lobby.provider.${session.player.provider}`);
		statusText.setText(
			i18n.t("login.signedInAs", {
				name: session.player.displayName || session.player.providerId,
				provider: providerLabel,
			})
		);
	} else {
		statusText.setText(i18n.t("login.notSignedIn"));
		if (logoutButton) {
			logoutButton.container.destroy();
			logoutButton = null;
		}
	}
}

/**
 * Run a provider login then land in the lobby. Errors surface in a modal so
 * the player can pick another provider or return.
 */
async function enterWith(login: () => Promise<unknown>): Promise<void> {
	if (loggingIn) return;
	loggingIn = true;
	try {
		await login();
		void go("multiplayer_lobby");
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		showLoginError(`${i18n.t("title.multiplayer.loginFailed")}\n\n${detail}`);
	} finally {
		loggingIn = false;
	}
}

/** Small dismissible modal for login errors. */
function showLoginError(message: string): void {
	const modal = Modal.createModal({
		width: 560,
		height: 320,
		title: i18n.t("login.title"),
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
