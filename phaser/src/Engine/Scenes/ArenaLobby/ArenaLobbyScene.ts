
import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { checkActiveSession, enableMultiplayer, logout, getPlayerProfile } from "@Multiplayer/MultiplayerManager";

import { setCurrentScene } from "@Models/State";

export class ArenaLobbyScene extends Phaser.Scene {
	private profileText?: Phaser.GameObjects.Text;
	private ratingText?: Phaser.GameObjects.Text;

	constructor() {
		super(SCENE_KEYS.ARENA_LOBBY);
	}

	create() {
		setCurrentScene(this);
		this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e).setOrigin(0);

		io.Text(t("title.arena"), { fontSize: "64px", color: "#ffffff" })
			.setPosition(MIDDLE_SCREEN.x, 100)
			.setOrigin(0.5);

		this.profileText = io.Text("Loading...", { fontSize: "32px", color: "#aaaaaa" })
			.setPosition(MIDDLE_SCREEN.x, 200)
			.setOrigin(0.5);

		this.ratingText = io.Text("", { fontSize: "48px", color: "#ffd700", fontStyle: "bold" })
			.setPosition(MIDDLE_SCREEN.x, 260)
			.setOrigin(0.5);

		// Buttons
		const buttonY = 500;

		createUIButton("Start / Continue Run", vec2(MIDDLE_SCREEN.x, buttonY), async () => {
			const hasActiveSession = await checkActiveSession();
			if (hasActiveSession) {
				await enableMultiplayer();
				this.scene.start(SCENE_KEYS.BATTLEGROUND);
			} else {
				this.scene.start(SCENE_KEYS.CRYSTAL_SELECTION, { isArena: true });
			}
		});

		createUIButton("Logout", vec2(MIDDLE_SCREEN.x, buttonY + 70), () => {
			logout();
			this.scene.start(SCENE_KEYS.ARENA_LOGIN);
		});

		createUIButton(t("ui.menu.back"), vec2(MIDDLE_SCREEN.x, buttonY + 140), () => {
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
				console.error("Profile Fetch Failed", e);
				// Redirect to Login if invalid
				this.scene.start(SCENE_KEYS.ARENA_LOGIN);
			}
		}
	}
}
