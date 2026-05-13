import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton, Button } from "@Components/UIButton";
import { createModal } from "@Components/Modal";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import {
	handleAuthLogin,
	handleAuthRegister,
	handleAuthGuest,
	handleGuestAccountUpgrade,
	getCurrentAccountState,
	handleRegisteredAccountUpdate,
	handleSteamAuth,
} from "@Multiplayer/MultiplayerManager";
import { setCurrentScene } from "@Models/State";
import { isElectron } from "@Utils/environment";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("ArenaLoginScene");

// Layout positioning
const TITLE_Y = 100;
const TITLE_FONT_SIZE = "64px";
const STEAM_LOGIN_Y = 600;
const FORM_CONTENT_Y = 300;
const FIRST_BUTTON_Y = 500;
const BUTTON_Y_OFFSET_REGISTER = 70;
const BUTTON_Y_OFFSET_GUEST = 140;
const BUTTON_Y_OFFSET_BACK = 210;

// Styling
const BACKGROUND_COLOR = 0x1a1a2e;
const STEAM_LOGIN_FONT_SIZE = "24px";
const STEAM_LOGIN_COLOR = "#00aaff";
const FORM_WIDTH = 300;
const FORM_GAP = 15;

// Modal styling
const MODAL_WIDTH = 400;
const MODAL_HEIGHT = 300;
const MODAL_TEXT_FONT_SIZE = "24px";
const MODAL_TEXT_WRAP_WIDTH = 360;
const MODAL_BUTTON_Y_OFFSET = 100;
const ACCOUNT_UPDATED_MODAL_WIDTH = 480;
const ACCOUNT_UPDATED_MODAL_HEIGHT = 350;
const ACCOUNT_UPDATED_MODAL_BUTTON_Y_OFFSET = 125;

type SceneModalOptions = {
	width?: number;
	height?: number;
	textWrapWidth?: number;
	buttonYOffset?: number;
};

type ArenaLoginSceneData = {
	mode?: "login" | "register" | "convertGuestAccount" | "manageAccount";
	returnSceneKey?: string;
};

export class ArenaLoginScene extends Phaser.Scene {
	private formElement?: Phaser.GameObjects.DOMElement;
	private isRegisterMode: boolean = false;
	private guestUpgradeMode: boolean = false;
	private accountManagementMode: boolean = false;
	private buttonContainer: Phaser.GameObjects.Container | null = null;
	private titleText?: Phaser.GameObjects.Text;
	private buttons: Button[] = [];
	private loadingOverlay?: Phaser.GameObjects.Container;
	private returnSceneKey: string = SCENE_KEYS.TITLE;
	private accountDefaults: { username?: string; email?: string } = {};

	constructor() {
		super(SCENE_KEYS.ARENA_LOGIN);
	}

	init(data?: ArenaLoginSceneData) {
		this.guestUpgradeMode = data?.mode === "convertGuestAccount";
		this.accountManagementMode = data?.mode === "manageAccount";
		this.isRegisterMode = this.guestUpgradeMode || this.accountManagementMode || data?.mode === "register";
		this.returnSceneKey = data?.returnSceneKey || SCENE_KEYS.TITLE;
		this.accountDefaults = {};
	}

	create() {
		setCurrentScene(this);
		this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BACKGROUND_COLOR).setOrigin(0);

		this.titleText = io
			.Text("Arena Login", { fontSize: TITLE_FONT_SIZE, color: "#ffffff" })
			.setPosition(MIDDLE_SCREEN.x, TITLE_Y)
			.setOrigin(0.5);

		this.buttonContainer = this.add.container(0, 0);

		// Initial Render
		this.renderForm();

		const loadingBg = this.add
			.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.5)
			.setOrigin(0);
		const loadingLabel = this.add
			.text(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y, "Loading...", { fontSize: "32px", color: "#ffffff" })
			.setOrigin(0.5);
		this.loadingOverlay = this.add.container(0, 0, [loadingBg, loadingLabel]);
		this.loadingOverlay.setVisible(false).setDepth(100);

		if (isElectron() && !this.isRegisterMode) {
			this.handleSteamLogin();
			io.Text("Logging in with Steam...", {
				fontSize: STEAM_LOGIN_FONT_SIZE,
				color: STEAM_LOGIN_COLOR,
			})
				.setPosition(MIDDLE_SCREEN.x, STEAM_LOGIN_Y)
				.setOrigin(0.5);
		}

		if (this.accountManagementMode) {
			void this.loadAccountDefaults();
		}
	}

	private async loadAccountDefaults() {
		try {
			this.accountDefaults = await getCurrentAccountState();
			this.applyAccountDefaults();
		} catch (error) {
			logger.error("Failed to load account details", error);
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
		this.buttons = [];

		const buttonY = FIRST_BUTTON_Y;

		if (this.isRegisterMode) {
			this.titleText?.setText(this.accountManagementMode || this.guestUpgradeMode ? "Account" : "Create Account");
			const includePasswordFields = !this.accountManagementMode;
			const passwordFields = includePasswordFields
				? `
                    <input type="password" name="password" placeholder="Password" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                    <input type="password" name="confirm_password" placeholder="Confirm Password" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                `
				: "";
			const emailField = this.accountManagementMode
				? ""
				: `
                    <label for="account-email" style="color:#ffffff; font-size:16px; margin-bottom:-8px;">Email</label>
                    <input id="account-email" type="text" name="email" placeholder="Email" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                `;

			const formHTML = `
                <div style="display:flex; flex-direction:column; gap:${FORM_GAP}px; width: ${FORM_WIDTH}px; font-family: sans-serif;">
                    <label for="account-username" style="color:#ffffff; font-size:16px; margin-bottom:-8px;">Username</label>
                    <input id="account-username" type="text" name="username" placeholder="Username" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                    ${emailField}
                    ${passwordFields}
                </div>
            `;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.formElement = (this.add as any)
				.dom(MIDDLE_SCREEN.x, FORM_CONTENT_Y)
				.createFromHTML(formHTML);
			this.formElement!.setOrigin(0.5);
			this.applyAccountDefaults();

			// Register Button
			const primaryButtonLabel = this.accountManagementMode
				? "Save Account"
				: this.guestUpgradeMode
					? "Convert Account"
					: "Create Account";
			const regBtn = createUIButton(primaryButtonLabel, vec2(MIDDLE_SCREEN.x, buttonY), () => {
				this.handleRegister();
			});
			this.buttons.push(regBtn);
			this.buttonContainer?.add(regBtn.container);

			// Back to Login
			const backBtn = createUIButton(
				this.accountManagementMode || this.guestUpgradeMode ? "Back to Lobby" : "Back to Login",
				vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET_REGISTER),
				() => {
					if (this.accountManagementMode || this.guestUpgradeMode) {
						this.scene.start(this.returnSceneKey);
						return;
					}

					this.isRegisterMode = false;
					this.renderForm();
				}
			);
			this.buttons.push(backBtn);
			this.buttonContainer?.add(backBtn.container);
		} else {
			this.titleText?.setText("Arena Login");

			const formHTML = `
                <div style="display:flex; flex-direction:column; gap:${FORM_GAP}px; width: ${FORM_WIDTH}px; font-family: sans-serif;">
                    <input type="text" name="email" placeholder="Email" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                    <input type="password" name="password" placeholder="Password" style="padding:12px; font-size:18px; border-radius:5px; border:none;">
                </div>
            `;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.formElement = (this.add as any)
				.dom(MIDDLE_SCREEN.x, FORM_CONTENT_Y)
				.createFromHTML(formHTML);
			this.formElement!.setOrigin(0.5);

			// Login
			const loginBtn = createUIButton("Login", vec2(MIDDLE_SCREEN.x, buttonY), () => {
				this.handleLogin();
			});
			this.buttons.push(loginBtn);
			this.buttonContainer?.add(loginBtn.container);

			// Register Switch
			const regBtn = createUIButton(
				"Register",
				vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET_REGISTER),
				() => {
					this.isRegisterMode = true;
					this.renderForm();
				}
			);
			this.buttons.push(regBtn);
			this.buttonContainer?.add(regBtn.container);

			// Guest
			const guestBtn = createUIButton(
				"Play as Guest",
				vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET_GUEST),
				() => {
					this.handleGuest();
				}
			);
			this.buttons.push(guestBtn);
			this.buttonContainer?.add(guestBtn.container);

			// Back to Title
			const backBtn = createUIButton(
				t("ui.menu.back"),
				vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET_BACK),
				() => {
					this.scene.start(SCENE_KEYS.TITLE);
				}
			);
			this.buttons.push(backBtn);
			this.buttonContainer?.add(backBtn.container);
		}
	}

	private applyAccountDefaults() {
		if (!this.formElement || !this.isRegisterMode) {
			return;
		}

		const usernameInput = this.formElement.getChildByName("username") as HTMLInputElement | null;
		const emailInput = this.formElement.getChildByName("email") as HTMLInputElement | null;

		if (usernameInput && this.accountDefaults.username) {
			usernameInput.value = this.accountDefaults.username;
		}

		if (emailInput && this.accountDefaults.email) {
			emailInput.value = this.accountDefaults.email;
		}
	}

	private getInputs(): {
		email?: string;
		pass?: string;
		username?: string;
		confirmPass?: string;
	} | null {
		if (!this.formElement) return null;

		const emailInput = this.formElement.getChildByName(
			"email"
		) as unknown as HTMLInputElement | null;
		const passInput = this.formElement.getChildByName(
			"password"
		) as unknown as HTMLInputElement | null;

		let usernameInput: HTMLInputElement | null = null;
		let confirmPassInput: HTMLInputElement | null = null;

		if (this.isRegisterMode) {
			usernameInput = this.formElement.getChildByName(
				"username"
			) as unknown as HTMLInputElement | null;
			confirmPassInput = this.formElement.getChildByName(
				"confirm_password"
			) as unknown as HTMLInputElement | null;
		}

		return {
			email: emailInput?.value,
			pass: passInput?.value,
			username: usernameInput?.value,
			confirmPass: confirmPassInput?.value,
		};
	}

	private setLoading(isLoading: boolean) {
		this.buttons.forEach(btn => isLoading ? btn.disable() : btn.enable());
		this.loadingOverlay?.setVisible(isLoading);
		if (this.formElement) {
			this.formElement.node.querySelectorAll('input').forEach(
				input => ((input as HTMLInputElement).disabled = isLoading)
			);
		}
	}

	async handleLogin() {
		const inputs = this.getInputs();
		if (!inputs || !inputs.email || !inputs.pass) {
			this.showModal("Error", "Please enter email and password.");
			return;
		}

		this.setLoading(true);
		try {
			const profile = await handleAuthLogin(inputs.email, inputs.pass);
			if (!profile?.id) {
				throw new Error("Login succeeded but no profile id was returned");
			}
			localStorage.setItem("mana_player_id", profile.id);
			this.scene.start(SCENE_KEYS.ARENA_LOBBY);
		} catch (e) {
			this.showModal("Login Failed", (e as Error).message);
			this.setLoading(false);
		}
	}

	async handleRegister() {
		const inputs = this.getInputs();
		if (!inputs || !inputs.username || (!this.accountManagementMode && !inputs.email)) {
			this.showModal("Error", "Please fill in all fields.");
			return;
		}

		if (!this.accountManagementMode && (!inputs.pass || !inputs.confirmPass)) {
			this.showModal("Error", "Please fill in all fields.");
			return;
		}

		if (!this.accountManagementMode && inputs.pass !== inputs.confirmPass) {
			this.showModal("Error", "Passwords do not match.");
			return;
		}

		const password = inputs.pass;
		const email = inputs.email;

		this.setLoading(true);
		try {
			if (this.accountManagementMode) {
				const profile = await handleRegisteredAccountUpdate(inputs.username);
				localStorage.setItem("mana_player_id", profile.id);
				this.setLoading(false);
				this.showModal(
					"Account Updated",
					"Your username was updated.",
					() => {
						this.scene.start(this.returnSceneKey);
					},
					{
						width: ACCOUNT_UPDATED_MODAL_WIDTH,
						height: ACCOUNT_UPDATED_MODAL_HEIGHT,
						textWrapWidth: ACCOUNT_UPDATED_MODAL_WIDTH - 40,
						buttonYOffset: ACCOUNT_UPDATED_MODAL_BUTTON_Y_OFFSET,
					}
				);
				return;
			}

			if (this.guestUpgradeMode) {
				const profile = await handleGuestAccountUpgrade(email!, password!, inputs.username);
				localStorage.setItem("mana_player_id", profile.id);
				this.setLoading(false);
				this.showModal(
					"Account Updated",
					"Your guest account can now use these login details. If a confirmation email was sent, confirm it to finish setup.",
					() => {
						this.scene.start(this.returnSceneKey);
					},
					{
						width: ACCOUNT_UPDATED_MODAL_WIDTH,
						height: ACCOUNT_UPDATED_MODAL_HEIGHT,
						textWrapWidth: ACCOUNT_UPDATED_MODAL_WIDTH - 40,
						buttonYOffset: ACCOUNT_UPDATED_MODAL_BUTTON_Y_OFFSET,
					}
				);
				return;
			}

			const result = (await handleAuthRegister(email!, password!, inputs.username)) as
				| { success?: boolean; requiresConfirmation?: boolean; id?: string }
				| undefined;

			if (result && result.success && result.requiresConfirmation) {
				this.setLoading(false);
				this.showModal(
					"Registration Successful",
					"Registration successful! Please confirm your email.",
					() => {
						this.isRegisterMode = false;
						this.renderForm();
					}
				);
			} else if (result?.id) {
				localStorage.setItem("mana_player_id", result.id);
				// this.showModal("Success", "Registration Successful!");
				this.scene.start(SCENE_KEYS.ARENA_LOBBY);
			} else {
				throw new Error("Registration succeeded but no profile id was returned");
			}
		} catch (e) {
			this.showModal("Registration Failed", (e as Error).message);
			this.setLoading(false);
		}
	}

	async handleGuest() {
		this.setLoading(true);
		try {
			const profile = await handleAuthGuest();
			if (!profile?.id) {
				throw new Error("Guest login failed to return profile id");
			}
			localStorage.setItem("mana_player_id", profile.id);
			this.scene.start(SCENE_KEYS.ARENA_LOBBY);
		} catch (e) {
			logger.error("Guest login failed", e);
			this.showModal("Guest Login Failed", (e as Error).message);
			this.setLoading(false);
		}
	}

	async handleSteamLogin() {
		try {
			logger.debug("Attempting Steam Login...");
			const profile = await handleSteamAuth();
			if (profile?.id) {
				localStorage.setItem("mana_player_id", profile.id);
				this.scene.start(SCENE_KEYS.ARENA_LOBBY);
			}
		} catch (e) {
			logger.error("Steam Login Failed:", e);
		}
	}
	showModal(title: string, message: string, onClose?: () => void, options: SceneModalOptions = {}) {
		if (this.formElement) this.formElement.setVisible(false);

		const modal = createModal({
			width: options.width ?? MODAL_WIDTH,
			height: options.height ?? MODAL_HEIGHT,
			title: title,
		});

		const text = io
			.Text(message, {
				fontSize: MODAL_TEXT_FONT_SIZE,
				color: "#ffffff",
				wordWrap: { width: options.textWrapWidth ?? MODAL_TEXT_WRAP_WIDTH },
			})
			.setOrigin(0.5);

		modal.panel.add(text);

		const closeBtn = createUIButton("OK", vec2(0, options.buttonYOffset ?? MODAL_BUTTON_Y_OFFSET), () => {
			if (this.formElement) this.formElement.setVisible(true);
			modal.close();
			if (onClose) onClose();
		});
		modal.panel.add(closeBtn.container);

		this.add.existing(modal.container);
	}
}
