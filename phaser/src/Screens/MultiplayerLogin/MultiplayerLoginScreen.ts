import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Modal from "@Components/Modal/Modal";
import * as UIButton from "@Components/Button/UIButton";
import { env } from "@Env";
import { createEvent } from "@game/Models";
import { createScreen, ScreenCtx, screenModule, type Destroyable } from "@mana/framework";
import { authSession } from "../../lib/authSession";
import { googleAuth } from "../../lib/googleAuth";
import { guestAuth } from "../../lib/guestAuth";
import { itchAuth } from "../../lib/itchAuth";
import { steamAuth } from "../../lib/steamAuth";
import { GameEvent } from "../../Events";
import { getScreenManager } from "../ScreenManager";
import * as cloudsBg from "../Title/Components/cloudsBg";

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

export type Context = ScreenCtx<never, MultiplayerLoginEvents>;

/**
 * Multiplayer login hub (docs/android-multiplayer.md) — the provider-choice
 * screen:
 *
 *   [multiplayer button] → [login screen: Steam? / Google / itch.io / Guest / Log out / Back]
 *                        → [multiplayer lobby]
 *
 * Fresh Electron (Steam build) entries auto-log-in and skip this screen, but
 * a logged-out Steam player lands here with PLAY WITH STEAM on top (above
 * the other providers) so they can re-enter via Steam or switch providers.
 * The screen shows the current auth state (signed in as whom), lets the
 * player pick a provider (Steam, Google — popup on web, system browser on
 * Android — itch.io, or instant guest play), log out, or return to the
 * title. Any successful login lands in the lobby, which re-reads the
 * persisted `{ token, player }` session.
 */

/** Guards re-entry while a login is in flight. */
let loggingIn = false;

/** Module refs for the auth-state UI, updated in place on logout. */
let statusText: Phaser.GameObjects.Text | null = null;
let logoutButton: UIButton.Button | null = null;

const screen = createScreen<never, MultiplayerLoginEvents>({
	name: "multiplayer_login",

	events: () => {
		const steamClicked = createEvent<void>();
		const googleClicked = createEvent<void>();
		const itchClicked = createEvent<void>();
		const guestClicked = createEvent<void>();
		const logoutClicked = createEvent<void>();
		const backClicked = createEvent<void>();

		return {
			events: {
				steamClicked,
				googleClicked,
				itchClicked,
				guestClicked,
				logoutClicked,
				backClicked,
			},
			listeners: [
				GameEvent.screenHidden.listen(cleanup),
				steamClicked.listen(() => {
					void enterWith(steamAuth.loginWithSteam);
				}),
				googleClicked.listen(() => {
					void enterWith(googleAuth.loginWithGoogle);
				}),
				itchClicked.listen(() => {
					void enterWith(itchAuth.loginWithItch);
				}),
				guestClicked.listen(() => {
					void enterWith(guestAuth.loginAsGuest);
				}),
				logoutClicked.listen(() => {
					authSession.clearSession();
					renderAuthState();
				}),
				backClicked.listen(() => {
					void getScreenManager().go("title");
				}),
			],
		};
	},

	create: async (ctx) => {
		const elements: Destroyable[] = [];
		const { steamClicked, googleClicked, itchClicked, guestClicked, logoutClicked, backClicked } =
			ctx.events;

		// The Steam slot sits above every other provider. When Steam is
		// unavailable (web/Android) the shift is 0 and the layout below is
		// exactly the old one.
		const showSteam = steamAuth.isSteamAvailable();
		const shift = showSteam ? STEAM_SHIFT : 0;

		const background = cloudsBg.create();
		if (background) elements.push(background);

		const title = env.scene.add
			.text(constants.MIDDLE_SCREEN_X, 90, i18n.t("login.title"), constants.titleTextConfig)
			.setOrigin(0.5);
		elements.push(title);

		// Signed-in state line — updated in place by logout.
		statusText = env.scene.add
			.text(constants.MIDDLE_SCREEN_X, STATUS_Y, "", constants.defaultTextConfig)
			.setOrigin(0.5)
			.setWordWrapWidth(900, true);
		elements.push(statusText);

		// Steam re-entry — first slot, shown only when the Steam client is
		// present (Electron). A logged-out Steam player lands here from the
		// lobby and can re-enter via Steam or pick another provider below.
		if (showSteam) {
			const steamBtn = UIButton.create({
				text: i18n.t("login.playWithSteam"),
				position: [constants.MIDDLE_SCREEN_X, STEAM_Y],
				width: 380,
				callback: () => {
					steamClicked.emit();
				},
				tooltip: {
					title: i18n.t("login.playWithSteam"),
					description: i18n.t("login.steamTooltip"),
					position: "right",
				},
			});
			elements.push(steamBtn.container);
		}

		// Google sign-in — shown whenever a client id is baked into the build
		// (web + Android; hidden when unset so the button can't error).
		if (googleAuth.isConfigured()) {
			const googleBtn = UIButton.create({
				text: i18n.t("login.signInGoogle"),
				position: [constants.MIDDLE_SCREEN_X, GOOGLE_Y + shift],
				width: 380,
				callback: () => {
					googleClicked.emit();
				},
				tooltip: {
					title: i18n.t("login.signInGoogle"),
					description: i18n.t("login.googleTooltip"),
					position: "right",
				},
			});
			elements.push(googleBtn.container);
		}

		const itchBtn = UIButton.create({
			text: i18n.t("login.signInItch"),
			position: [constants.MIDDLE_SCREEN_X, ITCH_Y + shift],
			width: 380,
			callback: () => {
				itchClicked.emit();
			},
		});
		elements.push(itchBtn.container);

		// Guest play — no OAuth round-trip, the server assigns a random
		// handle. Always available (POST /auth/guest needs no provider).
		const guestBtn = UIButton.create({
			text: i18n.t("login.playAsGuest"),
			position: [constants.MIDDLE_SCREEN_X, GUEST_Y + shift],
			width: 380,
			callback: () => {
				guestClicked.emit();
			},
			tooltip: {
				title: i18n.t("login.playAsGuest"),
				description: i18n.t("login.guestTooltip"),
				position: "right",
			},
		});
		elements.push(guestBtn.container);

		const backBtn = UIButton.create({
			text: i18n.t("login.back"),
			position: [constants.MIDDLE_SCREEN_X, BACK_Y + shift],
			width: 380,
			callback: () => {
				backClicked.emit();
			},
		});
		elements.push(backBtn.container);

		// Logout button — only when a session exists. Destroyed in place when
		// the player logs out (the framework tears everything down on exit).
		if (authSession.readStoredSession()) {
			logoutButton = UIButton.create({
				text: i18n.t("login.logOut"),
				position: [constants.MIDDLE_SCREEN_X, LOGOUT_Y + shift],
				width: 380,
				callback: () => {
					logoutClicked.emit();
				},
			});
			elements.push(logoutButton.container);
		}

		renderAuthState();

		return elements;
	},
});

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
		void getScreenManager().go("multiplayer_lobby");
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

/** Drop module refs on screen teardown (framework destroys the objects). */
function cleanup(): void {
	statusText = null;
	logoutButton = null;
	loggingIn = false;
}

export const { init, create, destroy, name, currentPhase } = screenModule(screen);
