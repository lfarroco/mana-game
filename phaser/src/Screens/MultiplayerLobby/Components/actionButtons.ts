import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as MultiplayerLobbyScreen from "../MultiplayerLobbyScreen";

const PLAY_Y = 800;
const LOGOUT_Y = 895;
const BACK_Y = 990;

/**
 * Lobby action buttons: an adaptive PLAY button ("RESUME" when an active run
 * exists, "NEW GAME" otherwise) plus LOG OUT (clears the stored session so
 * the player can switch providers) plus BACK. All emit screen events so the
 * screen module owns the navigation logic.
 */
export function create(
	ctx: MultiplayerLobbyScreen.Context,
	hasActiveSession: boolean
): Phaser.GameObjects.Container[] {
	const playBtn = UIButton.create({
		text: i18n.t(hasActiveSession ? "lobby.resume" : "lobby.newGame"),
		position: [constants.MIDDLE_SCREEN_X, PLAY_Y],
		width: 380,
		callback: ctx.events.playClicked.emit,
	});

	const logoutBtn = UIButton.create({
		text: i18n.t("lobby.logOut"),
		position: [constants.MIDDLE_SCREEN_X, LOGOUT_Y],
		width: 380,
		callback: ctx.events.logoutClicked.emit,
	});

	const backBtn = UIButton.create({
		text: i18n.t("lobby.back"),
		position: [constants.MIDDLE_SCREEN_X, BACK_Y],
		width: 380,
		callback: ctx.events.backClicked.emit,
	});

	return [playBtn.container, logoutBtn.container, backBtn.container];
}
