import * as cloudsBg from "../Title/Components/cloudsBg";
import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Modal from "@Components/Modal/Modal";
import * as UIButton from "@Components/Button/UIButton";
import * as profilePanel from "./Components/profilePanel";
import * as statsPanel from "./Components/statsPanel";
import * as actionButtons from "./Components/actionButtons";
import * as changeName from "./Components/changeName";
import * as renameModal from "./Components/renameModal";
import { createEvent } from "@game/Models";
import { createScreen, ScreenCtx, screenModule, type Destroyable } from "@mana/framework";
import { authSession } from "../../lib/authSession";
import { setMultiplayerMode } from "../../lib/multiplayerMode";
import { remoteServer, RemoteServerError, type MultiplayerProfile } from "../../RemoteServer";
import { env } from "@Env";
import { GameEvent } from "../../Events";
import { getScreenManager } from "../ScreenManager";

export type MultiplayerLobbyEvents = {
	playClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
};

export type Context = ScreenCtx<never, MultiplayerLobbyEvents>;

/**
 * Multiplayer lobby (docs/multiplayer-lobby.md) — the hub between the title
 * screen and a multiplayer run. Loads the player's profile (`GET
 * /api/v1/players/me`): display name, provider, rating, career + season
 * victory stats, and whether a run is resumable. The PLAY button adapts to
 * that (RESUME / NEW GAME); BACK returns to the title screen.
 */
const screen = createScreen<never, MultiplayerLobbyEvents>({
	name: "multiplayer_lobby",

	events: () => {
		const playClicked = createEvent<void>();
		const backClicked = createEvent<void>();

		return {
			events: { playClicked, backClicked },
			listeners: [
				GameEvent.screenHidden.listen(cleanup),
				playClicked.listen(handlePlay),
				backClicked.listen(() => {
					void getScreenManager().go("title");
				}),
			],
		};
	},

	create: async (ctx) => {
		hasActiveRun = false;
		currentProfile = null;
		identityPanel = null;
		changeNameElement = null;
		const elements: Destroyable[] = [];

		const background = cloudsBg.create();
		if (background) elements.push(background);

		const title = env.scene.add
			.text(constants.MIDDLE_SCREEN_X, 90, i18n.t("lobby.title"), constants.titleTextConfig)
			.setOrigin(0.5);
		elements.push(title);

		// Loading indicator while the profile request is in flight.
		const loading = env.scene.add
			.text(
				constants.MIDDLE_SCREEN_X,
				constants.MIDDLE_SCREEN_Y,
				i18n.t("lobby.loading"),
				constants.defaultTextConfig
			)
			.setOrigin(0.5);
		elements.push(loading);

		try {
			const stored = authSession.readStoredSession();
			if (!stored) {
				throw new Error(i18n.t("lobby.loadFailed"));
			}

			const profile = await remoteServer.getProfile(stored.player.playerId);
			hasActiveRun = profile.hasActiveSession;
			currentProfile = profile;

			loading.destroy();

			const identity = profilePanel.create(profile, [constants.MIDDLE_SCREEN_X - 640, 420]);
			identityPanel = identity;
			const changeNameSection = changeName.create(
				profile,
				[constants.MIDDLE_SCREEN_X - 640, 690],
				() => openRenameModal(ctx)
			);
			changeNameElement = changeNameSection;

			elements.push(
				identity.container,
				changeNameSection.container,
				statsPanel.create({
					title: i18n.t("lobby.career"),
					counts: profile.career,
					position: [constants.MIDDLE_SCREEN_X, 420],
				}),
				statsPanel.create({
					title: i18n.t("lobby.season"),
					counts: profile.season,
					position: [constants.MIDDLE_SCREEN_X + 640, 420],
				}),
				...actionButtons.create(ctx, hasActiveRun)
			);
		} catch (err) {
			loading.destroy();
			if (handleAuthExpired(err)) return;
			const detail = err instanceof Error ? err.message : String(err);
			showLobbyError(`${i18n.t("lobby.loadFailed")}\n\n${detail}`);
		}

		return elements;
	},
});

/** True when the loaded profile reports a resumable run (drives the play button). */
let hasActiveRun = false;

/** The latest server profile — re-synced after a rename so panels can update. */
let currentProfile: MultiplayerProfile | null = null;

/** Live refs to the identity UI, updated in place after a rename. */
let identityPanel: profilePanel.ProfilePanelElement | null = null;
let changeNameElement: changeName.ChangeNameElement | null = null;

const cleanup = () => {
	hasActiveRun = false;
	currentProfile = null;
	identityPanel = null;
	changeNameElement = null;
	renameModal.destroy();
};

/**
 * Open the rename modal. The submitted name goes to
 * `remoteServer.updateDisplayName`; on success the refreshed profile (returned
 * by the server) is written back into the identity UI, the persisted auth
 * session (so the login screen shows the new name), and `currentProfile`.
 */
function openRenameModal(_ctx: Context): void {
	const currentName =
		currentProfile?.player.displayName?.trim() || currentProfile?.player.providerId || "";
	renameModal.open({
		currentName,
		onSubmit: async (name: string) => {
			const profile = await remoteServer.updateDisplayName(name);
			currentProfile = profile;
			// Keep the persisted auth session's display name in sync — the
			// login screen renders it from the stored session.
			const stored = authSession.readStoredSession();
			if (stored) {
				authSession.saveSession({
					...stored,
					player: { ...stored.player, displayName: profile.player.displayName },
				});
			}
			identityPanel?.update(profile);
			changeNameElement?.update(profile);
		},
	});
}

export const { init, create, destroy, name, currentPhase } = screenModule(screen, {
	onDestroy: () => renameModal.destroy(),
});

/** Adaptive play action: resume the active run, or start a new multiplayer game. */
async function handlePlay(): Promise<void> {
	if (hasActiveRun) {
		await resumeActiveRun();
	} else {
		// New run: route crystal selection through the remote server.
		setMultiplayerMode(true);
		await getScreenManager().go("crystals");
	}
}

/** Patch the server session into client state and enter the battleground. */
async function resumeActiveRun(): Promise<void> {
	const stored = authSession.readStoredSession();
	if (!stored) {
		showLobbyError(i18n.t("lobby.loadFailed"));
		return;
	}
	try {
		const session = await remoteServer.getSession(stored.player.playerId);
		if (!session) {
			// The run finished between the profile load and the click — fall
			// through to a fresh run.
			setMultiplayerMode(true);
			await getScreenManager().go("crystals");
			return;
		}
		if (session.phase === "combat" && session.combatState) {
			env.patchState({ session, combatState: session.combatState });
		} else {
			env.patchState({ session });
		}
		await getScreenManager().go("battleground");
	} catch (err) {
		if (handleAuthExpired(err)) return;
		const detail = err instanceof Error ? err.message : String(err);
		showLobbyError(detail);
	}
}

/**
 * Re-auth path for expired/invalid bearer tokens (docs/android-multiplayer.md):
 * the persisted session is stale (30-day TTL, no refresh) — clear it and send
 * the player to the multiplayer login screen instead of a dead-end error
 * modal. Returns true when handled.
 */
function handleAuthExpired(err: unknown): boolean {
	if (err instanceof RemoteServerError && err.status === 401) {
		authSession.clearSession();
		void getScreenManager().go("multiplayer_login");
		return true;
	}
	return false;
}

/** Small dismissible modal for lobby load/action errors. */
function showLobbyError(message: string): void {
	const modal = Modal.createModal({
		width: 560,
		height: 320,
		title: i18n.t("lobby.title"),
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
		text: i18n.t("lobby.back"),
		position: [0, 110],
		width: 200,
		callback: () => {
			void modal.close();
		},
	});

	modal.container.add([text, okButton.container]);
}
