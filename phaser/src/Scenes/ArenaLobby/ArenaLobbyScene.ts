
import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { MultiplayerManager } from "../../Multiplayer/MultiplayerManager";
import { LoginModal } from "./LoginModal";

import { setCurrentScene } from "@Models/State";

export class ArenaLobbyScene extends Phaser.Scene {
	private loginModal?: LoginModal;
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

		createUIButton("Find Match", vec2(MIDDLE_SCREEN.x, buttonY), () => {
			const playerId = localStorage.getItem("player_id");
			if (playerId) {
				this.scene.start(SCENE_KEYS.CRYSTAL_SELECTION, { isArena: true });
			} else {
				alert("Please Login or Play as Guest first!");
			}
		});

		// Guest Button
		createUIButton("Play as Guest", vec2(MIDDLE_SCREEN.x, buttonY + 70), () => {
			this.handleGuest();
		});

		createUIButton("Login / Register", vec2(MIDDLE_SCREEN.x, buttonY + 140), () => {
			this.openLoginModal();
		});

		createUIButton(t("ui.menu.back"), vec2(MIDDLE_SCREEN.x, buttonY + 210), () => {
			this.scene.start(SCENE_KEYS.TITLE);
		});

		this.loginModal = new LoginModal(this);

		this.refreshProfile();
	}

	async handleGuest() {
		try {
			const profile = await MultiplayerManager.getInstance().handleAuthGuest();
			this.updateUI(profile);
			localStorage.setItem("player_id", profile.id);
		} catch (e) {
			console.error(e);
			alert("Guest Login Failed: " + (e as Error).message);
		}
	}

	async refreshProfile() {
		// Mock ID or get from localStorage
		const playerId = localStorage.getItem("player_id");
		if (!playerId) {
			// Not Logged In
			this.profileText?.setText("Not Logged In");
			this.ratingText?.setText("");
		} else {
			try {
				const profile = await MultiplayerManager.getInstance().getPlayerProfile(playerId);
				this.updateUI(profile);
			} catch (e) {
				// Invalid ID?
				console.error("Profile Fetch Failed", e);
				this.profileText?.setText("Error Fetching Profile");
			}
		}
	}

	updateUI(profile: any) {
		this.profileText?.setText(profile.username || `Guest#${profile.id.substr(0, 4)}`);
		this.ratingText?.setText(`Rating: ${profile.rating}`);
	}

	openLoginModal() {
		this.loginModal?.show((success) => {
			if (success) this.refreshProfile();
		});
	}
}
