import * as renameModal from "./renameModal";
import { RemoteServerError } from "../../../RemoteServer";

/**
 * Unit tests for the DOM-based rename modal (jsdom). The modal is pure DOM +
 * i18n, so no Phaser mocks are needed. The lobby screen owns the server call;
 * here we assert input collection, client-side validation, and error/success
 * handling.
 */

function openModal(onSubmit: (name: string) => Promise<void> = jest.fn(async () => {})) {
	renameModal.open({ currentName: "Momo", onSubmit });
	const modal = document.getElementById("rename-modal");
	if (!modal) throw new Error("rename modal was not created");
	const input = modal.querySelector("input") as HTMLInputElement;
	const buttons = Array.from(modal.querySelectorAll("button"));
	const save = buttons.find((b) => b.textContent === "SAVE");
	const cancel = buttons.find((b) => b.textContent === "CANCEL");
	if (!save || !cancel) throw new Error("save/cancel buttons not found");
	return { modal, input, save, cancel };
}

describe("renameModal", () => {
	afterEach(() => {
		renameModal.destroy();
		document.body.innerHTML = "";
	});

	it("opens with the current name prefilled", () => {
		const { input } = openModal();
		expect(input.value).toBe("Momo");
	});

	it("submits the trimmed name and closes on success", async () => {
		const onSubmit = jest.fn(async () => {});
		const { input, save } = openModal(onSubmit);

		input.value = "  NovaMage  ";
		save.click();

		// Give the async submit a tick to resolve.
		await new Promise((r) => setTimeout(r, 0));
		expect(onSubmit).toHaveBeenCalledWith("NovaMage");
		expect(document.getElementById("rename-modal")).toBeNull();
	});

	it("rejects client-side invalid names without calling onSubmit", () => {
		const onSubmit = jest.fn(async () => {});
		const { input, save } = openModal(onSubmit);

		input.value = "a"; // shorter than the 2-char minimum
		save.click();
		expect(onSubmit).not.toHaveBeenCalled();
		expect(document.getElementById("rename-modal")).not.toBeNull();

		input.value = "x".repeat(25); // longer than the 24-char maximum
		save.click();
		expect(onSubmit).not.toHaveBeenCalled();

		input.value = "Bad\u0000Name"; // control character
		save.click();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("shows the server error message when the rename fails", async () => {
		const onSubmit = jest.fn(async () => {
			throw new RemoteServerError(400, "invalid_display_name", "Name too long");
		});
		const { input, save, modal } = openModal(onSubmit);

		input.value = "NovaMage";
		save.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(modal.textContent).toContain("Could not change your name.");
		expect(modal.textContent).toContain("Name too long");
		expect(document.getElementById("rename-modal")).not.toBeNull();
	});

	it("shows a localized connectivity hint on a network-level failure", async () => {
		const onSubmit = jest.fn(async () => {
			throw new Error("Game server request failed: Failed to fetch");
		});
		const { input, save, modal } = openModal(onSubmit);

		input.value = "NovaMage";
		save.click();
		await new Promise((r) => setTimeout(r, 0));

		// The raw English fetch detail is not echoed to the player.
		expect(modal.textContent).toContain("Could not reach the game server.");
		expect(modal.textContent).not.toContain("Failed to fetch");
		expect(document.getElementById("rename-modal")).not.toBeNull();
	});

	it("shows the cooldown message on a 429 name_change_cooldown error", async () => {
		const onSubmit = jest.fn(async () => {
			throw new RemoteServerError(
				429,
				"name_change_cooldown",
				"Display name was changed recently — you can change it again on 2026-10-01T00:00:00.000Z"
			);
		});
		const { input, save, modal } = openModal(onSubmit);

		input.value = "NovaMage";
		save.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(modal.textContent).toContain("You recently changed your name.");
		// The raw server message is not echoed — the countdown hint in the
		// lobby is the precise source of truth.
		expect(modal.textContent).not.toContain("change it again");
	});

	it("closes silently on a 401 (the lobby screen handles re-authentication)", async () => {
		const onSubmit = jest.fn(async () => {
			throw new RemoteServerError(401, "invalid_token", "expired");
		});
		const { input, save } = openModal(onSubmit);

		input.value = "NovaMage";
		save.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(document.getElementById("rename-modal")).toBeNull();
	});

	it("closes on Escape and on the cancel button", () => {
		openModal();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(document.getElementById("rename-modal")).toBeNull();

		const { cancel } = openModal();
		cancel.click();
		expect(document.getElementById("rename-modal")).toBeNull();
	});

	it("destroy is idempotent", () => {
		openModal();
		renameModal.destroy();
		renameModal.destroy();
		expect(document.getElementById("rename-modal")).toBeNull();
	});
});
