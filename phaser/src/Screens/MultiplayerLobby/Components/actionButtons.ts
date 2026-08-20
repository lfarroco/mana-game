import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as MultiplayerLobbyScreen from "../MultiplayerLobbyScreen";

const PLAY_Y = 830;
const BACK_Y = 935;

/**
 * Lobby action buttons: an adaptive PLAY button ("RESUME" when an active run
 * exists, "NEW GAME" otherwise) plus BACK. Both emit screen events so the
 * screen module owns the navigation logic.
 */
export function create(
	ctx: MultiplayerLobbyScreen.Context,
	hasActiveSession: boolean,
): Phaser.GameObjects.Container[] {
	const playBtn = UIButton.create({
		text: i18n.t(hasActiveSession ? "lobby.resume" : "lobby.newGame"),
		position: [constants.MIDDLE_SCREEN_X, PLAY_Y],
		width: 380,
		callback: ctx.events.playClicked.emit,
	});

	const backBtn = UIButton.create({
		text: i18n.t("lobby.back"),
		position: [constants.MIDDLE_SCREEN_X, BACK_Y],
		width: 380,
		callback: ctx.events.backClicked.emit,
	});

	return [playBtn.container, backBtn.container];
}
