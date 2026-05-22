import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN } from "@Constants/constants";
import { createUIButton } from "@Components/UIButton";
import { vec2 } from "@Models/Geometry";
import { handleAuthLogin, handleAuthRegister } from "@Multiplayer/MultiplayerManager";
import {
	ARENA_OVERLAY_ALPHA,
	ARENA_OVERLAY_COLOR,
	ARENA_SURFACE_ACCENT_COLOR,
	ARENA_SURFACE_ALPHA,
	ARENA_SURFACE_BORDER_COLOR,
	ARENA_SURFACE_BORDER_WIDTH,
	ARENA_SURFACE_COLOR,
	ARENA_TEXT_PRIMARY,
} from "Client/Scenes/ArenaLobby/arenaTheme";

// Layout positioning
const MODAL_DEPTH = 100;
const TITLE_Y_OFFSET = 150;
const LOGIN_BUTTON_Y_OFFSET = 50;
const REGISTER_BUTTON_Y_OFFSET = 50;
const CANCEL_BUTTON_Y_OFFSET = 150;

// Panel styling
const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 400;
const PANEL_STROKE_WIDTH = ARENA_SURFACE_BORDER_WIDTH;
const PANEL_STROKE_COLOR = ARENA_SURFACE_BORDER_COLOR;

// Title styling
const TITLE_FONT_SIZE = "32px";

export class LoginModal {
	private scene: Phaser.Scene;
	private container: Phaser.GameObjects.Container;
	private callback?: (success: boolean) => void;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.container = this.scene.add.container(0, 0);
		this.container.setVisible(false);
		this.container.setDepth(MODAL_DEPTH);

		this.createUI();
	}

	createUI() {
		// Dark Overlay
		const bg = this.scene.add
			.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, ARENA_OVERLAY_COLOR, ARENA_OVERLAY_ALPHA)
			.setOrigin(0);
		bg.setInteractive(); // Block clicks
		this.container.add(bg);

		// Panel
		const panel = this.scene.add
			.rectangle(
				MIDDLE_SCREEN.x,
				MIDDLE_SCREEN.y,
				PANEL_WIDTH,
				PANEL_HEIGHT,
				ARENA_SURFACE_COLOR,
				ARENA_SURFACE_ALPHA
			)
			.setOrigin(0.5);
		panel.setStrokeStyle(PANEL_STROKE_WIDTH, PANEL_STROKE_COLOR);
		this.container.add(panel);
		const accent = this.scene.add
			.rectangle(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y - 100, 220, 4, ARENA_SURFACE_ACCENT_COLOR, 0.95)
			.setOrigin(0.5);
		this.container.add(accent);

		// Title
		const title = this.scene.add
			.text(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y - TITLE_Y_OFFSET, "Authentication", {
				fontSize: TITLE_FONT_SIZE,
				color: ARENA_TEXT_PRIMARY,
			})
			.setOrigin(0.5);
		this.container.add(title);

		// Login Button
		const loginBtn = createUIButton(
			"Login",
			vec2(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y - LOGIN_BUTTON_Y_OFFSET),
			() => this.handleLogin()
		);
		this.container.add(loginBtn.container);

		// Register Button
		const regBtn = createUIButton(
			"Register",
			vec2(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y + REGISTER_BUTTON_Y_OFFSET),
			() => this.handleRegister()
		);
		this.container.add(regBtn.container);

		// Cancel Button
		const cancelBtn = createUIButton(
			"Cancel",
			vec2(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y + CANCEL_BUTTON_Y_OFFSET),
			() => this.hide()
		);
		this.container.add(cancelBtn.container);
	}

	async handleLogin() {
		const username = window.prompt("Enter Username:");
		if (!username) return;
		const password = window.prompt("Enter Password:");
		if (!password) return;

		try {
			const profile = await handleAuthLogin(username, password);
			if (!profile?.id) {
				throw new Error("Login succeeded but no profile id was returned");
			}
			localStorage.setItem("player_id", profile.id);
			alert("Login Successful!");
			this.hide(true);
		} catch (e) {
			alert("Login Failed: " + (e as Error).message);
		}
	}

	async handleRegister() {
		const username = window.prompt("Choose Username:");
		if (!username) return;
		const password = window.prompt("Choose Password:");
		if (!password) return;

		try {
			// Use current guest ID if available to link? Or new?
			// Existing logic: handleAuthRegister(playerId, username, password) updates the player.
			// So we pass the current local ID.
			const playerId = localStorage.getItem("player_id");
			if (!playerId) {
				alert("Error: No guest session found. Please reload.");
				return;
			}

			const profile = await handleAuthRegister(username, password);
			if (profile && typeof profile === "object" && "id" in profile) {
				localStorage.setItem("player_id", profile.id as string);
			}
			// alert("Registration Successful!");
			this.hide(true);
		} catch (e) {
			alert("Registration Failed: " + (e as Error).message);
		}
	}

	show(callback?: (success: boolean) => void) {
		this.callback = callback;
		this.container.setVisible(true);
	}

	hide(success: boolean = false) {
		this.container.setVisible(false);
		if (this.callback) this.callback(success);
	}
}
