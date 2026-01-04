
import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { MultiplayerManager } from "../../Multiplayer/MultiplayerManager";
import { setCurrentScene } from "@Models/State";
import { isElectron } from "@Utils/environment";

export class ArenaLoginScene extends Phaser.Scene {
	private formElement?: Phaser.GameObjects.DOMElement;

	constructor() {
		super(SCENE_KEYS.ARENA_LOGIN);
	}

	create() {
		setCurrentScene(this);
		this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e).setOrigin(0);

		io.Text("Arena Login", { fontSize: "64px", color: "#ffffff" })
			.setPosition(MIDDLE_SCREEN.x, 100)
			.setOrigin(0.5);


		// HTML Form for Inputs
		const formHTML = `
            <div style="display:flex; flex-direction:column; gap:15px; width: 300px; font-family: sans-serif;">
                <input type="text" name="email" placeholder="Email" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                <input type="password" name="password" placeholder="Password" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
            </div>
        `;

		this.formElement = (this.add as any).dom(MIDDLE_SCREEN.x, 300).createFromHTML(formHTML);
		this.formElement!.setOrigin(0.5);

		// Forgot Password Text
		const forgotPwd = io.Text("Forgot Password?", { fontSize: "20px", color: "#aaaaaa", fontStyle: "italic" })
			.setPosition(MIDDLE_SCREEN.x, 400)
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		forgotPwd.on('pointerdown', () => {
			alert("Password Reset functionality coming soon.");
		});

		// Buttons
		const buttonY = 500;

		// Login
		createUIButton("Login", vec2(MIDDLE_SCREEN.x, buttonY), () => {
			this.handleLogin();
		});

		// Register
		createUIButton("Register", vec2(MIDDLE_SCREEN.x, buttonY + 70), () => {
			this.handleRegister();
		});

		// Guest
		createUIButton("Play as Guest", vec2(MIDDLE_SCREEN.x, buttonY + 140), () => {
			this.handleGuest();
		});

		// Back
		createUIButton(t("ui.menu.back"), vec2(MIDDLE_SCREEN.x, buttonY + 210), () => {
			this.scene.start(SCENE_KEYS.TITLE);
		});

		if (isElectron()) {
			this.handleSteamLogin();
			io.Text("Logging in with Steam...", { fontSize: "24px", color: "#00aaff" })
				.setPosition(MIDDLE_SCREEN.x, buttonY + 280)
				.setOrigin(0.5);
		}
	}

	private getInputs(): { email: string, pass: string } | null {
		if (!this.formElement) return null;
		// Access underlying DOM values
		const emailInput = this.formElement.getChildByName('email') as unknown as HTMLInputElement | null;
		const passInput = this.formElement.getChildByName('password') as unknown as HTMLInputElement | null;

		if (!emailInput || !passInput) return null;

		return { email: emailInput.value, pass: passInput.value };
	}

	async handleLogin() {
		const inputs = this.getInputs();
		if (!inputs || !inputs.email || !inputs.pass) {
			alert("Please enter email and password.");
			return;
		}

		try {
			const profile = await MultiplayerManager.getInstance().handleAuthLogin(inputs.email, inputs.pass);
			localStorage.setItem("mana_player_id", profile.id);
			// Go to Lobby
			this.scene.start(SCENE_KEYS.ARENA_LOBBY);
		} catch (e) {
			alert("Login Failed: " + (e as Error).message);
		}
	}

	async handleRegister() {
		const inputs = this.getInputs();
		if (!inputs || !inputs.email || !inputs.pass) {
			alert("Please enter email and password to register.");
			return;
		}

		try {
			const profile = await MultiplayerManager.getInstance().handleAuthRegister(inputs.email, inputs.pass);
			localStorage.setItem("mana_player_id", profile.id);
			alert("Registration Successful!");
			this.scene.start(SCENE_KEYS.ARENA_LOBBY);
		} catch (e) {
			alert("Registration Failed: " + (e as Error).message);
		}
	}

	async handleGuest() {
		try {
			const profile = await MultiplayerManager.getInstance().handleAuthGuest();
			localStorage.setItem("mana_player_id", profile.id);
			this.scene.start(SCENE_KEYS.ARENA_LOBBY);
		} catch (e) {
			console.error(e);
			alert("Guest Login Failed: " + (e as Error).message);
		}
	}

	async handleSteamLogin() {
		try {
			console.log("Attempting Steam Login...");
			const profile = await MultiplayerManager.getInstance().handleSteamAuth();
			if (profile) {
				localStorage.setItem("mana_player_id", profile.id);
				this.scene.start(SCENE_KEYS.ARENA_LOBBY);
			}
		} catch (e) {
			console.error("Steam Login Failed:", e);
			// Don't alert, just log. Let user login manually if failed.
		}
	}
}
