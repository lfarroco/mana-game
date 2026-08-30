import * as i18n from "@i18n/i18n";
import { RemoteServerError } from "../../../RemoteServer";

/**
 * DOM-based "change username" modal for the multiplayer lobby.
 *
 * A plain-HTML overlay (backdrop + centered panel + text input + Cancel/Save)
 * positioned over the Phaser canvas — the same pattern as the crystal-selection
 * keyboard (Components/keyboard.ts). The lobby screen owns the actual
 * `remoteServer.updateDisplayName` call via `onSubmit`; this component only
 * collects the input, validates it against the same rules the server enforces
 * (playerService `validateDisplayName`), and renders success/error feedback.
 *
 * DOM cleanup follows the screen-DOM pattern in AGENTS.md: module-level refs
 * and an idempotent `destroy()` that the lobby screen calls from its own
 * `destroy()` (never rely on Phaser scene shutdown events).
 */

// Mirrors server/src/services/playerService.ts — keep in sync.
const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 24;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

let activeBackdrop: HTMLElement | null = null;
let activeKeyListener: ((e: KeyboardEvent) => void) | null = null;
let saveInFlight = false;

/** Remove the modal from the DOM and detach the Escape listener. Idempotent. */
export function destroy(): void {
	saveInFlight = false;
	if (activeKeyListener) {
		document.removeEventListener("keydown", activeKeyListener);
		activeKeyListener = null;
	}
	if (activeBackdrop && document.body.contains(activeBackdrop)) {
		document.body.removeChild(activeBackdrop);
	}
	activeBackdrop = null;
}

export type RenameModalConfig = {
	/** Prefill for the input (the player's current display name). */
	currentName: string;
	/**
	 * Perform the rename. Resolves on success (the modal closes itself);
	 * rejects with a `RemoteServerError` (or any Error) whose message is shown
	 * inline. A 401 is treated as "the screen is re-authenticating" and the
	 * modal closes silently.
	 */
	onSubmit: (name: string) => Promise<void>;
};

export function open(config: RenameModalConfig): void {
	destroy();

	const backdrop = document.createElement("div");
	backdrop.id = "rename-modal";
	backdrop.style.position = "fixed";
	backdrop.style.inset = "0";
	backdrop.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
	backdrop.style.display = "flex";
	backdrop.style.alignItems = "center";
	backdrop.style.justifyContent = "center";
	backdrop.style.zIndex = "2000";
	backdrop.style.fontFamily = "Arimo, sans-serif";

	const panel = document.createElement("div");
	panel.style.width = "440px";
	panel.style.padding = "28px 32px 24px";
	panel.style.backgroundColor = "#08121f";
	panel.style.border = "1px solid #2a4a63";
	panel.style.borderRadius = "12px";
	panel.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.5)";
	panel.style.display = "flex";
	panel.style.flexDirection = "column";
	panel.style.gap = "14px";

	const title = document.createElement("div");
	title.textContent = i18n.t("lobby.renameTitle");
	title.style.color = "#d9f7ff";
	title.style.fontSize = "24px";
	title.style.fontWeight = "bold";
	title.style.textAlign = "center";

	const hint = document.createElement("div");
	hint.textContent = i18n.t("lobby.renameHint");
	hint.style.color = "#8fcde5";
	hint.style.fontSize = "14px";
	hint.style.textAlign = "center";

	const input = document.createElement("input");
	input.type = "text";
	input.value = config.currentName;
	input.maxLength = MAX_DISPLAY_NAME_LENGTH;
	input.style.width = "100%";
	input.style.boxSizing = "border-box";
	input.style.padding = "10px 12px";
	input.style.fontSize = "18px";
	input.style.color = "#ffffff";
	input.style.backgroundColor = "#0d1b2a";
	input.style.border = "1px solid #2a4a63";
	input.style.borderRadius = "6px";
	input.style.outline = "none";

	const counter = document.createElement("div");
	counter.textContent = `${config.currentName.length}/${MAX_DISPLAY_NAME_LENGTH}`;
	counter.style.color = "#8fcde5";
	counter.style.fontSize = "12px";
	counter.style.textAlign = "right";

	input.addEventListener("input", () => {
		counter.textContent = `${input.value.length}/${MAX_DISPLAY_NAME_LENGTH}`;
	});

	const error = document.createElement("div");
	error.style.color = "#ff6b6b";
	error.style.fontSize = "14px";
	error.style.textAlign = "center";
	error.style.minHeight = "18px";

	const buttons = document.createElement("div");
	buttons.style.display = "flex";
	buttons.style.gap = "12px";
	buttons.style.justifyContent = "center";

	const buttonStyle =
		"padding: 10px 24px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid;";

	const cancelBtn = document.createElement("button");
	cancelBtn.textContent = i18n.t("lobby.renameCancel");
	cancelBtn.style.cssText =
		buttonStyle + "background: #1b2a3a; color: #c6e7f5; border-color: #2a4a63;";
	cancelBtn.onclick = () => destroy();

	const saveBtn = document.createElement("button");
	saveBtn.textContent = i18n.t("lobby.renameSave");
	saveBtn.style.cssText =
		buttonStyle + "background: #2f6f4f; color: #ffffff; border-color: #3d8a63;";
	saveBtn.onclick = () => void submit();

	buttons.append(cancelBtn, saveBtn);
	panel.append(title, hint, input, counter, error, buttons);
	backdrop.appendChild(panel);

	const closeOnBackdrop = (e: MouseEvent) => {
		if (e.target === backdrop) destroy();
	};
	backdrop.addEventListener("mousedown", closeOnBackdrop);

	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			destroy();
		} else if (e.key === "Enter") {
			e.preventDefault();
			void submit();
		}
	};
	document.addEventListener("keydown", onKey);

	document.body.appendChild(backdrop);
	activeBackdrop = backdrop;
	activeKeyListener = onKey;

	// Focus + select the current name so typing replaces it immediately.
	// On Android the soft keyboard can cover the centered panel, so bring the
	// input into view (guarded: jsdom test environments lack scrollIntoView).
	input.focus();
	input.select();
	if (typeof input.scrollIntoView === "function") {
		input.scrollIntoView({ block: "center" });
	}

	function showError(message: string): void {
		error.textContent = message;
		saveBtn.disabled = false;
		saveBtn.style.opacity = "1";
	}

	async function submit(): Promise<void> {
		if (saveInFlight) return;
		const name = input.value.trim();

		if (name.length < MIN_DISPLAY_NAME_LENGTH) {
			showError(i18n.t("lobby.renameTooShort"));
			return;
		}
		if (name.length > MAX_DISPLAY_NAME_LENGTH) {
			showError(i18n.t("lobby.renameTooLong"));
			return;
		}
		if (CONTROL_CHARACTER_PATTERN.test(name)) {
			showError(i18n.t("lobby.renameInvalid"));
			return;
		}

		saveInFlight = true;
		saveBtn.disabled = true;
		saveBtn.style.opacity = "0.6";
		error.textContent = "";

		try {
			await config.onSubmit(name);
			destroy();
		} catch (err) {
			saveInFlight = false;
			// A 401 means the bearer token expired — the lobby screen handles
			// re-authentication and navigates away; the modal goes with it.
			if (err instanceof RemoteServerError && err.status === 401) {
				destroy();
				return;
			}
			if (err instanceof RemoteServerError) {
				if (err.code === "name_change_cooldown") {
					// Server-side race (e.g. another device renamed recently): the
					// lobby's countdown hint is the precise source of truth, so a
					// generic localized message suffices here.
					showError(i18n.t("lobby.renameCooldown"));
				} else {
					showError(`${i18n.t("lobby.renameError")} ${err.message}`);
				}
				return;
			}
			// Network-level failure (server unreachable, CORS-blocked request…):
			// the raw fetch detail is English-only and meaningless to players —
			// show a localized connectivity hint instead.
			showError(i18n.t("lobby.renameNetwork"));
		}
	}
}
