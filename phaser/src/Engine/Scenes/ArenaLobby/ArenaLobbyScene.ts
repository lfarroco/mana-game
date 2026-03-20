import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import {
	checkActiveSession,
	enableMultiplayer,
	logout,
	getPlayerProfile,
} from "@Multiplayer/MultiplayerManager";

import { setCurrentScene } from "@Models/State";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("ArenaLobbyScene");

// Layout positioning
const BACKGROUND_COLOR = 0x1a1a2e;
const TITLE_Y = 100;
const PROFILE_TEXT_Y = 200;
const RATING_TEXT_Y = 260;
const FIRST_BUTTON_Y = 500;
const BUTTON_Y_OFFSET = 70;
const BACK_BUTTON_Y_OFFSET = 140;

// Title styling
const TITLE_FONT_SIZE = "64px";

// Profile/Rating styling
const PROFILE_FONT_SIZE = "32px";
const RATING_FONT_SIZE = "48px";

export class ArenaLobbyScene extends Phaser.Scene {
	private profileText?: Phaser.GameObjects.Text;
	private ratingText?: Phaser.GameObjects.Text;

	constructor() {
		super(SCENE_KEYS.ARENA_LOBBY);
	}

	create() {
		setCurrentScene(this);
		this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BACKGROUND_COLOR).setOrigin(0);

		io.Text(t("title.arena"), { fontSize: TITLE_FONT_SIZE, color: "#ffffff" })
			.setPosition(MIDDLE_SCREEN.x, TITLE_Y)
			.setOrigin(0.5);

		this.profileText = io
			.Text("Loading...", { fontSize: PROFILE_FONT_SIZE, color: "#aaaaaa" })
			.setPosition(MIDDLE_SCREEN.x, PROFILE_TEXT_Y)
			.setOrigin(0.5);

		this.ratingText = io
			.Text("", { fontSize: RATING_FONT_SIZE, color: "#ffd700", fontStyle: "bold" })
			.setPosition(MIDDLE_SCREEN.x, RATING_TEXT_Y)
			.setOrigin(0.5);

		// Buttons
		const buttonY = FIRST_BUTTON_Y;

		createUIButton("Start / Continue Run", vec2(MIDDLE_SCREEN.x, buttonY), async () => {
			const hasActiveSession = await checkActiveSession();
			if (hasActiveSession) {
				await enableMultiplayer();
				this.scene.start(SCENE_KEYS.BATTLEGROUND, { isMultiplayer: true });
			} else {
				this.scene.start(SCENE_KEYS.CRYSTAL_SELECTION, { isArena: true });
			}
		});

		createUIButton("Logout", vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET), () => {
			logout();
			this.scene.start(SCENE_KEYS.ARENA_LOGIN);
		});

		createUIButton(t("ui.menu.back"), vec2(MIDDLE_SCREEN.x, buttonY + BACK_BUTTON_Y_OFFSET), () => {
			this.scene.start(SCENE_KEYS.TITLE);
		});

		this.refreshProfile();
	}

	async refreshProfile() {
		const playerId = localStorage.getItem("mana_player_id");
		if (!playerId) {
			this.scene.start(SCENE_KEYS.ARENA_LOGIN);
		} else {
			try {
				const profile = await getPlayerProfile(playerId);
				this.profileText?.setText(profile.username || `Guest#${profile.id.substr(0, 4)}`);
				this.ratingText?.setText(`Rating: ${profile.rating}`);
			} catch (e) {
				logger.error("Profile Fetch Failed", e);
				// Redirect to Login if invalid
				this.scene.start(SCENE_KEYS.ARENA_LOGIN);
			}
		}
	}
}
