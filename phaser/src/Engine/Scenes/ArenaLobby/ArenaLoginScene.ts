
import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { createModal } from "@Components/Modal";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { handleAuthLogin, handleAuthRegister, handleAuthGuest, handleSteamAuth } from "@Multiplayer/MultiplayerManager";
import { setCurrentScene } from "@Models/State";
import { isElectron } from "@Utils/environment";

export class ArenaLoginScene extends Phaser.Scene {
	private formElement?: Phaser.GameObjects.DOMElement;
	private isRegisterMode: boolean = false;
	private buttonContainer: Phaser.GameObjects.Container | null = null;
	private titleText?: Phaser.GameObjects.Text;

	constructor() {
		super(SCENE_KEYS.ARENA_LOGIN);
	}

	create() {
		setCurrentScene(this);
		this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e).setOrigin(0);

		this.titleText = io.Text("Arena Login", { fontSize: "64px", color: "#ffffff" })
			.setPosition(MIDDLE_SCREEN.x, 100)
			.setOrigin(0.5);

		this.buttonContainer = this.add.container(0, 0);

		// Initial Render
		this.renderForm();

		if (isElectron() && !this.isRegisterMode) {
			this.handleSteamLogin();
			io.Text("Logging in with Steam...", { fontSize: "24px", color: "#00aaff" })
				.setPosition(MIDDLE_SCREEN.x, 600) // Lower down
				.setOrigin(0.5);
		}
	}

	renderForm() {
		// Clear previous form if exists
		if (this.formElement) {
			this.formElement.destroy();
			this.formElement = undefined;
		}
		// Clear buttons
		if (this.buttonContainer) {
			this.buttonContainer.removeAll(true);
		}

		const buttonY = 500;

		if (this.isRegisterMode) {
			this.titleText?.setText("Create Account");

			const formHTML = `
                <div style="display:flex; flex-direction:column; gap:15px; width: 300px; font-family: sans-serif;">
                    <input type="text" name="username" placeholder="Username" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                    <input type="text" name="email" placeholder="Email" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                    <input type="password" name="password" placeholder="Password" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                    <input type="password" name="confirm_password" placeholder="Confirm Password" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                </div>
            `;

			this.formElement = (this.add as any).dom(MIDDLE_SCREEN.x, 300).createFromHTML(formHTML);
			this.formElement!.setOrigin(0.5);

			// Register Button
			const regBtn = createUIButton("Create Account", vec2(MIDDLE_SCREEN.x, buttonY), () => {
				this.handleRegister();
			});
			this.buttonContainer?.add(regBtn.container);

			// Back to Login
			const backBtn = createUIButton("Back to Login", vec2(MIDDLE_SCREEN.x, buttonY + 70), () => {
				this.isRegisterMode = false;
				this.renderForm();
			});
			this.buttonContainer?.add(backBtn.container);

		} else {
			this.titleText?.setText("Arena Login");

			const formHTML = `
                <div style="display:flex; flex-direction:column; gap:15px; width: 300px; font-family: sans-serif;">
                    <input type="text" name="email" placeholder="Email" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                    <input type="password" name="password" placeholder="Password" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                </div>
            `;

			this.formElement = (this.add as any).dom(MIDDLE_SCREEN.x, 300).createFromHTML(formHTML);
			this.formElement!.setOrigin(0.5);

			// Login
			const loginBtn = createUIButton("Login", vec2(MIDDLE_SCREEN.x, buttonY), () => {
				this.handleLogin();
			});
			this.buttonContainer?.add(loginBtn.container);

			// Register Switch
			const regBtn = createUIButton("Register", vec2(MIDDLE_SCREEN.x, buttonY + 70), () => {
				this.isRegisterMode = true;
				this.renderForm();
			});
			this.buttonContainer?.add(regBtn.container);

			// Guest
			const guestBtn = createUIButton("Play as Guest", vec2(MIDDLE_SCREEN.x, buttonY + 140), () => {
				this.handleGuest();
			});
			this.buttonContainer?.add(guestBtn.container);

			// Back to Title
			const backBtn = createUIButton(t("ui.menu.back"), vec2(MIDDLE_SCREEN.x, buttonY + 210), () => {
				this.scene.start(SCENE_KEYS.TITLE);
			});
			this.buttonContainer?.add(backBtn.container);
		}
	}

	private getInputs(): { email?: string, pass?: string, username?: string, confirmPass?: string } | null {
		if (!this.formElement) return null;

		const emailInput = this.formElement.getChildByName('email') as unknown as HTMLInputElement | null;
		const passInput = this.formElement.getChildByName('password') as unknown as HTMLInputElement | null;

		let usernameInput: HTMLInputElement | null = null;
		let confirmPassInput: HTMLInputElement | null = null;

		if (this.isRegisterMode) {
			usernameInput = this.formElement.getChildByName('username') as unknown as HTMLInputElement | null;
			confirmPassInput = this.formElement.getChildByName('confirm_password') as unknown as HTMLInputElement | null;
		}

		return {
			email: emailInput?.value,
			pass: passInput?.value,
			username: usernameInput?.value,
			confirmPass: confirmPassInput?.value
		};
	}

	async handleLogin() {
		const inputs = this.getInputs();
		if (!inputs || !inputs.email || !inputs.pass) {
			this.showModal("Error", "Please enter email and password.");
			return;
		}

		try {
			const profile = await handleAuthLogin(inputs.email, inputs.pass);
			localStorage.setItem("mana_player_id", profile.id);
			this.scene.start(SCENE_KEYS.ARENA_LOBBY);
		} catch (e) {
			this.showModal("Login Failed", (e as Error).message);
		}
	}

	async handleRegister() {
		const inputs = this.getInputs();
		if (!inputs || !inputs.email || !inputs.pass || !inputs.username || !inputs.confirmPass) {
			this.showModal("Error", "Please fill in all fields.");
			return;
		}

		if (inputs.pass !== inputs.confirmPass) {
			this.showModal("Error", "Passwords do not match.");
			return;
		}

		try {
			// Pass username separately to updated handleAuthRegister
			const result: any = await handleAuthRegister(inputs.email, inputs.pass, inputs.username);

			if (result && result.success && result.requiresConfirmation) {
				this.showModal("Registration Successful", "Registration successful! Please confirm your email.", () => {
					this.isRegisterMode = false;
					this.renderForm();
				});
			} else {
				localStorage.setItem("mana_player_id", result.id);
				// this.showModal("Success", "Registration Successful!");
				this.scene.start(SCENE_KEYS.ARENA_LOBBY);
			}
		} catch (e) {
			this.showModal("Registration Failed", (e as Error).message);
		}
	}

	async handleGuest() {
		try {
			const profile = await handleAuthGuest();
			localStorage.setItem("mana_player_id", profile.id);
			this.scene.start(SCENE_KEYS.ARENA_LOBBY);
		} catch (e) {
			console.error(e);
			this.showModal("Guest Login Failed", (e as Error).message);
		}
	}

	async handleSteamLogin() {
		try {
			console.log("Attempting Steam Login...");
			const profile = await handleSteamAuth();
			if (profile) {
				localStorage.setItem("mana_player_id", profile.id);
				this.scene.start(SCENE_KEYS.ARENA_LOBBY);
			}
		} catch (e) {
			console.error("Steam Login Failed:", e);
		}
	}
	showModal(title: string, message: string, onClose?: () => void) {
		if (this.formElement) this.formElement.setVisible(false);

		const modal = createModal({
			width: 400,
			height: 300,
			title: title
		});

		const text = io.Text(message, { fontSize: "24px", color: "#ffffff", wordWrap: { width: 360 } })
			.setOrigin(0.5);

		modal.panel.add(text);

		const closeBtn = createUIButton("OK", vec2(0, 100), () => {
			if (this.formElement) this.formElement.setVisible(true);
			modal.close();
			if (onClose) onClose();
		});
		modal.panel.add(closeBtn.container);

		this.add.existing(modal.container);
	}
}
