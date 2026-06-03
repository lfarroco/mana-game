import Phaser from "phaser";
import {
	defaultTextConfig,
	MIDDLE_SCREEN,
	SCREEN_HEIGHT,
	SCREEN_WIDTH,
	titleTextConfig,
} from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton, Button } from "Client/Components/UIButton";
import { createModal } from "Client/Components/Modal";
import { CloudsBackground } from "Client/Components/cloudBackground/CloudsBackground";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import {
	handleAuthLogin,
	handleAuthRegister,
	handleAuthGuest,
	handlePasswordResetRequest,
	handleGuestAccountUpgrade,
	getCurrentAccountState,
	handleRegisteredAccountUpdate,
	handleSteamAuth,
} from "@Multiplayer/MultiplayerManager";
import { isElectron } from "@Utils/environment";
import { createLogger } from "@Utils/Logger";
import {
	ARENA_BACKGROUND_OVERLAY_ALPHA,
	ARENA_BACKGROUND_OVERLAY_COLOR,
	ARENA_BACKGROUND_SHADER_COLORS,
	ARENA_HTML_INPUT_STYLE,
	ARENA_OVERLAY_ALPHA,
	ARENA_OVERLAY_COLOR,
	ARENA_SURFACE_ALPHA,
	ARENA_SURFACE_BORDER_ALPHA,
	ARENA_SURFACE_BORDER_COLOR,
	ARENA_SURFACE_BORDER_WIDTH,
	ARENA_SURFACE_COLOR,
	ARENA_TEXT_INFO,
	ARENA_TEXT_LABEL,
	ARENA_TEXT_MUTED,
	ARENA_TEXT_PRIMARY,
} from "Client/Screens/ArenaLobby/arenaTheme";

const logger = createLogger("ArenaLoginScene");

// Layout positioning
const TITLE_Y = 100;
const TITLE_FONT_SIZE = "64px";
const STEAM_LOGIN_Y = 470;
const FORM_CARD_Y = 430;
const FORM_CARD_WIDTH = 520;
const FORM_CARD_HEIGHT = 520;
const FORM_CONTENT_Y = 300;
const FIRST_BUTTON_Y = 470;
const BUTTON_Y_OFFSET_REGISTER = 70;
const BUTTON_Y_OFFSET_BACK = 140;

// Styling
const STEAM_LOGIN_FONT_SIZE = "24px";
const STEAM_LOGIN_COLOR = ARENA_TEXT_MUTED;
const FORM_WIDTH = 440;
const FORM_GAP = 15;
const FORM_LABEL_COLOR = ARENA_TEXT_LABEL;
const FORM_LABEL_FONT_SIZE = "16px";
const FULL_WIDTH_BUTTON = 440;
const HALF_WIDTH_BUTTON_GAP = 16;
const HALF_WIDTH_BUTTON = (FULL_WIDTH_BUTTON - HALF_WIDTH_BUTTON_GAP) / 2;

// Modal styling
const MODAL_WIDTH = 400;
const MODAL_HEIGHT = 300;
const MODAL_TEXT_FONT_SIZE = "24px";
const MODAL_TEXT_WRAP_WIDTH = 360;
const MODAL_BUTTON_Y_OFFSET = 100;
const ACCOUNT_UPDATED_MODAL_WIDTH = 480;
const ACCOUNT_UPDATED_MODAL_HEIGHT = 350;
const ACCOUNT_UPDATED_MODAL_BUTTON_Y_OFFSET = 125;

const createArenaText = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
	io.Text(text, { ...defaultTextConfig, ...style });

const createArenaTitleText = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
	io.Text(text, { ...titleTextConfig, ...style });

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
	private isForgotPasswordMode: boolean = false;
	private guestUpgradeMode: boolean = false;
	private accountManagementMode: boolean = false;
	private buttonContainer: Phaser.GameObjects.Container | null = null;
	private titleText?: Phaser.GameObjects.Text;
	private buttons: Button[] = [];
	private loadingOverlay?: Phaser.GameObjects.Container;
	private forgotPasswordLink?: HTMLButtonElement | null;
	private accountDefaults: { username?: string; email?: string } = {};


	init(data?: ArenaLoginSceneData) {
		this.guestUpgradeMode = data?.mode === "convertGuestAccount";
		this.accountManagementMode = data?.mode === "manageAccount";
		this.isRegisterMode =
			this.guestUpgradeMode || this.accountManagementMode || data?.mode === "register";
		this.isForgotPasswordMode = false;
		this.accountDefaults = {};
	}

	create() {
		new CloudsBackground({
			customColors: ARENA_BACKGROUND_SHADER_COLORS,
			timeScale: 0.9,
		});
		this.add
			.rectangle(
				0,
				0,
				SCREEN_WIDTH,
				SCREEN_HEIGHT,
				ARENA_BACKGROUND_OVERLAY_COLOR,
				ARENA_BACKGROUND_OVERLAY_ALPHA
			)
			.setOrigin(0);

		this.add
			.rectangle(
				MIDDLE_SCREEN.x,
				FORM_CARD_Y,
				FORM_CARD_WIDTH,
				FORM_CARD_HEIGHT,
				ARENA_SURFACE_COLOR,
				ARENA_SURFACE_ALPHA
			)
			.setOrigin(0.5)
			.setStrokeStyle(
				ARENA_SURFACE_BORDER_WIDTH,
				ARENA_SURFACE_BORDER_COLOR,
				ARENA_SURFACE_BORDER_ALPHA
			);

		this.titleText = createArenaTitleText("Arena Login", {
			fontSize: TITLE_FONT_SIZE,
			color: ARENA_TEXT_PRIMARY,
		})
			.setPosition(MIDDLE_SCREEN.x, TITLE_Y)
			.setOrigin(0.5);

		this.buttonContainer = this.add.container(0, 0);

		// Initial Render
		this.renderForm();

		const loadingBg = this.add
			.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, ARENA_OVERLAY_COLOR, ARENA_OVERLAY_ALPHA)
			.setOrigin(0);
		const loadingLabel = createArenaText("Loading...", {
			fontSize: "32px",
			color: ARENA_TEXT_PRIMARY,
		})
			.setPosition(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y)
			.setOrigin(0.5);
		this.loadingOverlay = this.add.container(0, 0, [loadingBg, loadingLabel]);
		this.loadingOverlay.setVisible(false).setDepth(100);

		if (isElectron() && !this.isRegisterMode && !this.isForgotPasswordMode) {
			this.handleSteamLogin();
			createArenaText("Logging in with Steam...", {
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
		this.forgotPasswordLink = null;
		// Clear buttons
		if (this.buttonContainer) {
			this.buttonContainer.removeAll(true);
		}
		this.buttons = [];

		const buttonY = FIRST_BUTTON_Y;

		if (this.isForgotPasswordMode) {
			this.titleText?.setText("Forgot Password");

			const formHTML = `
                <div style="display:flex; flex-direction:column; gap:${FORM_GAP}px; width: ${FORM_WIDTH}px; font-family: sans-serif;">
                    <label for="forgot-password-email" style="color:${FORM_LABEL_COLOR}; font-size:${FORM_LABEL_FONT_SIZE}; margin-bottom:-8px;">Email</label>
                    <input id="forgot-password-email" type="text" name="email" placeholder="Enter email" style="${ARENA_HTML_INPUT_STYLE}">
                </div>
            `;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.formElement = (this.add as any)
				.dom(MIDDLE_SCREEN.x, FORM_CONTENT_Y)
				.createFromHTML(formHTML);
			this.formElement!.setOrigin(0.5);

			const cancelBtn = createUIButton({
				text: "Cancel",
				position: vec2(
					MIDDLE_SCREEN.x - HALF_WIDTH_BUTTON / 2 - HALF_WIDTH_BUTTON_GAP / 2,
					buttonY
				),
				callback: () => {
					this.isForgotPasswordMode = false;
					this.renderForm();
				},
				width: HALF_WIDTH_BUTTON,
			});
			this.buttons.push(cancelBtn);
			this.buttonContainer?.add(cancelBtn.container);

			const submitBtn = createUIButton({
				text: "Submit",
				position: vec2(
					MIDDLE_SCREEN.x + HALF_WIDTH_BUTTON / 2 + HALF_WIDTH_BUTTON_GAP / 2,
					buttonY
				),
				callback: () => {
					void this.handleForgotPasswordSubmit();
				},
				width: HALF_WIDTH_BUTTON,
			});
			this.buttons.push(submitBtn);
			this.buttonContainer?.add(submitBtn.container);
		} else if (this.isRegisterMode) {
			this.titleText?.setText(
				this.accountManagementMode || this.guestUpgradeMode ? "Account" : "Create Account"
			);
			const includePasswordFields = !this.accountManagementMode;
			const passwordFields = includePasswordFields
				? `
                    <input type="password" name="password" placeholder="Password" style="${ARENA_HTML_INPUT_STYLE}">
                    <input type="password" name="confirm_password" placeholder="Confirm Password" style="${ARENA_HTML_INPUT_STYLE}">
                `
				: "";
			const emailField = this.accountManagementMode
				? ""
				: `
                    <label for="account-email" style="color:${FORM_LABEL_COLOR}; font-size:${FORM_LABEL_FONT_SIZE}; margin-bottom:-8px;">Email</label>
                    <input id="account-email" type="text" name="email" placeholder="Email" style="${ARENA_HTML_INPUT_STYLE}">
                `;

			const formHTML = `
                <div style="display:flex; flex-direction:column; gap:${FORM_GAP}px; width: ${FORM_WIDTH}px; font-family: sans-serif;">
                    <label for="account-username" style="color:${FORM_LABEL_COLOR}; font-size:${FORM_LABEL_FONT_SIZE}; margin-bottom:-8px;">Username</label>
                    <input id="account-username" type="text" name="username" placeholder="Username" style="${ARENA_HTML_INPUT_STYLE}">
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
			const regBtn = createUIButton({
				text: primaryButtonLabel,
				position: vec2(MIDDLE_SCREEN.x, buttonY),
				callback: () => {
					this.handleRegister();
				},
				width: FULL_WIDTH_BUTTON,
			});
			this.buttons.push(regBtn);
			this.buttonContainer?.add(regBtn.container);

			// Back to Login
			const backBtn = createUIButton({
				text:
					this.accountManagementMode || this.guestUpgradeMode ? "Back to Lobby" : "Back to Login",
				position: vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET_REGISTER),
				callback: () => {
					if (this.accountManagementMode || this.guestUpgradeMode) {
						//this.scene.start(this.returnSceneKey);
						return;
					}

					this.isRegisterMode = false;
					this.renderForm();
				},
				width: FULL_WIDTH_BUTTON,
			});
			this.buttons.push(backBtn);
			this.buttonContainer?.add(backBtn.container);
		} else {
			this.titleText?.setText("Arena Login");

			const formHTML = `
                <div style="display:flex; flex-direction:column; gap:${FORM_GAP}px; width: ${FORM_WIDTH}px; font-family: sans-serif;">
                    <label for="login-email" style="color:${FORM_LABEL_COLOR}; font-size:${FORM_LABEL_FONT_SIZE}; margin-bottom:-8px;">Email</label>
                    <input id="login-email" type="text" name="email" placeholder="Enter email" style="${ARENA_HTML_INPUT_STYLE}">
                    <label for="login-password" style="color:${FORM_LABEL_COLOR}; font-size:${FORM_LABEL_FONT_SIZE}; margin-bottom:-8px;">Password</label>
                    <input id="login-password" type="password" name="password" placeholder="Enter password" style="${ARENA_HTML_INPUT_STYLE}">
                    <button
                        type="button"
                        data-action="forgot-password"
                        style="align-self:flex-end; background:none; border:none; color:${ARENA_TEXT_INFO}; font-size:16px; padding:0; cursor:pointer;"
                    >
                        Forgot Password
                    </button>
                </div>
            `;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.formElement = (this.add as any)
				.dom(MIDDLE_SCREEN.x, FORM_CONTENT_Y)
				.createFromHTML(formHTML);
			this.formElement!.setOrigin(0.5);
			this.bindForgotPasswordLink();

			// Login
			const loginBtn = createUIButton({
				text: "LOGIN",
				position: vec2(MIDDLE_SCREEN.x, buttonY),
				callback: () => {
					this.handleLogin();
				},
				width: FULL_WIDTH_BUTTON,
			});
			this.buttons.push(loginBtn);
			this.buttonContainer?.add(loginBtn.container);

			// Register Switch
			const regBtn = createUIButton({
				text: "REGISTER",
				position: vec2(
					MIDDLE_SCREEN.x - HALF_WIDTH_BUTTON / 2 - HALF_WIDTH_BUTTON_GAP / 2,
					buttonY + BUTTON_Y_OFFSET_REGISTER
				),
				callback: () => {
					this.isRegisterMode = true;
					this.renderForm();
				},
				width: HALF_WIDTH_BUTTON,
			});
			this.buttons.push(regBtn);
			this.buttonContainer?.add(regBtn.container);

			// Guest
			const guestBtn = createUIButton({
				text: "PLAY AS GUEST",
				position: vec2(
					MIDDLE_SCREEN.x + HALF_WIDTH_BUTTON / 2 + HALF_WIDTH_BUTTON_GAP / 2,
					buttonY + BUTTON_Y_OFFSET_REGISTER
				),
				callback: () => {
					this.handleGuest();
				},
				width: HALF_WIDTH_BUTTON,
			});
			this.buttons.push(guestBtn);
			this.buttonContainer?.add(guestBtn.container);

			// Back to Title
			const backBtn = createUIButton({
				text: t("ui.menu.back"),
				position: vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET_BACK),
				callback: () => {
					//this.scene.start(SCENE_KEYS.TITLE);
				},
				width: FULL_WIDTH_BUTTON,
			});
			this.buttons.push(backBtn);
			this.buttonContainer?.add(backBtn.container);
		}
	}

	private bindForgotPasswordLink() {
		if (!this.formElement || this.isRegisterMode) {
			return;
		}

		const forgotPasswordButton = this.formElement.node.querySelector(
			'[data-action="forgot-password"]'
		) as HTMLButtonElement | null;
		this.forgotPasswordLink = forgotPasswordButton;
		this.forgotPasswordLink?.addEventListener("click", (event) => {
			event.preventDefault();
			this.isForgotPasswordMode = true;
			this.renderForm();
		});
	}

	private async handleForgotPasswordSubmit() {
		const inputs = this.getInputs();
		if (!inputs?.email) {
			this.showModal("Error", "Please enter email.");
			return;
		}

		this.setLoading(true);
		try {
			await handlePasswordResetRequest(inputs.email);
			this.setLoading(false);
			this.showModal(
				"Password Recovery",
				"If an account exists for that email, a reset link has been sent.",
				() => {
					this.isForgotPasswordMode = false;
					this.renderForm();
				}
			);
		} catch (error) {
			this.setLoading(false);
			this.showModal("Password Recovery Failed", (error as Error).message);
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
		this.buttons.forEach((btn) => (isLoading ? btn.disable() : btn.enable()));
		this.loadingOverlay?.setVisible(isLoading);
		if (this.formElement) {
			this.formElement.node
				.querySelectorAll("input")
				.forEach((input) => ((input as HTMLInputElement).disabled = isLoading));
		}
		if (this.forgotPasswordLink) {
			this.forgotPasswordLink.disabled = isLoading;
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
			//this.scene.start(SCENE_KEYS.ARENA_LOBBY);
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
						//this.scene.start(this.returnSceneKey);
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
						//this.scene.start(this.returnSceneKey);
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
				// this.scene.start(SCENE_KEYS.ARENA_LOBBY);
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
			//this.scene.start(SCENE_KEYS.ARENA_LOBBY);
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
				//this.scene.start(SCENE_KEYS.ARENA_LOBBY);
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
			panelConfig: {
				backgroundColor: ARENA_SURFACE_COLOR,
				backgroundAlpha: ARENA_SURFACE_ALPHA,
				borderColor: ARENA_SURFACE_BORDER_COLOR,
				borderAlpha: ARENA_SURFACE_BORDER_ALPHA,
				borderWidth: ARENA_SURFACE_BORDER_WIDTH,
			},
			overlayColor: ARENA_OVERLAY_COLOR,
			overlayAlpha: ARENA_OVERLAY_ALPHA,
		});

		const text = createArenaText(message, {
			fontSize: MODAL_TEXT_FONT_SIZE,
			color: ARENA_TEXT_PRIMARY,
			wordWrap: { width: options.textWrapWidth ?? MODAL_TEXT_WRAP_WIDTH },
		}).setOrigin(0.5);

		modal.panel.add(text);

		const closeBtn = createUIButton({
			text: "OK",
			position: vec2(0, options.buttonYOffset ?? MODAL_BUTTON_Y_OFFSET),
			callback: () => {
				if (this.formElement) this.formElement.setVisible(true);
				modal.close();
				if (onClose) onClose();
			},
		});
		modal.panel.add(closeBtn.container);

		this.add.existing(modal.container);
	}
}
