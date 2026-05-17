/**
 * Orb Shop Focus Controller
 *
 * Module-level singleton that tracks which orb is focused/selected for
 * keyboard/gamepad input. Follows the same pattern as the encounter focus
 * system (Encounter.ts + encounterFocusModel.ts).
 *
 * Flow:
 *  1. OrbShop registers entries via `registerOrbEntry` as it creates each orb.
 *  2. Controls/index.ts drives navigation with `navigateOrbFocus`,
 *     `confirmOrbFocus`, `cancelOrbSelection`, and `applySelectedOrbToUnit`.
 *  3. OrbShop calls `resetOrbFocus` when the shop closes.
 */

export type OrbFocusEntry = {
	orbId: string;
	/** Called when the highlight cursor moves to/away from this orb. */
	setFocused: (focused: boolean) => void;
	/** Called when this orb is "picked up" (armed for dropping). */
	setSelected: (selected: boolean) => void;
	/**
	 * Apply this orb to the given unit.
	 * Returns `true` if the orb was successfully consumed, `false` if it
	 * could not be applied (e.g., unit doesn't match orb requirements).
	 */
	applyToUnit: (unitId: string) => Promise<boolean>;
};

let orbFocusEntries: OrbFocusEntry[] = [];
let focusedOrbIndex: number | null = null;
let selectedOrbIndex: number | null = null;

export const hasOrbShopTargets = (): boolean => orbFocusEntries.length > 0;

export const getOrbFocusCount = (): number => orbFocusEntries.length;

export const getFocusedOrbIndex = (): number | null => focusedOrbIndex;

export const getSelectedOrbIndex = (): number | null => selectedOrbIndex;

export const hasSelectedOrb = (): boolean => selectedOrbIndex !== null;

export const registerOrbEntry = (entry: OrbFocusEntry): void => {
	orbFocusEntries.push(entry);
};

export const resetOrbFocus = (): void => {
	orbFocusEntries.forEach((entry) => {
		entry.setFocused(false);
		entry.setSelected(false);
	});
	orbFocusEntries = [];
	focusedOrbIndex = null;
	selectedOrbIndex = null;
};

const applyFocus = (nextIndex: number | null): void => {
	orbFocusEntries.forEach((entry, index) =>
		entry.setFocused(index === nextIndex && selectedOrbIndex !== index)
	);
	focusedOrbIndex = nextIndex;
};

export const ensureOrbFocus = (): void => {
	if (focusedOrbIndex === null && orbFocusEntries.length > 0) {
		applyFocus(0);
	}
};

export const blurOrbFocus = (): void => {
	applyFocus(null);
};

export const navigateOrbFocus = (direction: "up" | "down"): void => {
	if (orbFocusEntries.length === 0) return;

	if (focusedOrbIndex === null) {
		applyFocus(direction === "up" ? orbFocusEntries.length - 1 : 0);
		return;
	}

	const delta = direction === "up" ? -1 : 1;
	const next = (focusedOrbIndex + delta + orbFocusEntries.length) % orbFocusEntries.length;
	applyFocus(next);
};

/**
 * Arm the currently focused orb. Returns `true` if an orb was selected,
 * `false` if there is nothing to select (no focus, or an orb is already held).
 */
export const confirmOrbFocus = (): boolean => {
	if (focusedOrbIndex === null || orbFocusEntries.length === 0) return false;
	if (selectedOrbIndex !== null) return false;

	selectedOrbIndex = focusedOrbIndex;
	orbFocusEntries[selectedOrbIndex].setSelected(true);
	applyFocus(null); // Remove focus highlight while orb is "held"
	return true;
};

/**
 * Put the currently held orb back. Returns `true` if there was a selection
 * to cancel.
 */
export const cancelOrbSelection = (): boolean => {
	if (selectedOrbIndex === null) return false;

	orbFocusEntries[selectedOrbIndex]?.setSelected(false);
	// Restore focus to the orb that was deselected
	const restoredIndex = selectedOrbIndex;
	selectedOrbIndex = null;
	applyFocus(restoredIndex);
	return true;
};

/**
 * Drop the held orb onto the given unit. Removes the orb entry from the
 * list on success (it dissolves in-world).
 * Returns `true` on success, `false` if the orb couldn't be applied.
 */
export const applySelectedOrbToUnit = async (unitId: string): Promise<boolean> => {
	if (selectedOrbIndex === null) return false;
	const entry = orbFocusEntries[selectedOrbIndex];
	if (!entry) return false;

	const success = await entry.applyToUnit(unitId);
	if (!success) {
		// Orb couldn't be applied — put it back
		entry.setSelected(false);
		const restoredIndex = selectedOrbIndex;
		selectedOrbIndex = null;
		applyFocus(restoredIndex);
		return false;
	}

	// Orb was consumed — clean up
	entry.setSelected(false);
	entry.setFocused(false);

	const appliedIndex = selectedOrbIndex;
	orbFocusEntries.splice(appliedIndex, 1);
	selectedOrbIndex = null;

	// Clamp focused index to the new list length
	if (orbFocusEntries.length === 0) {
		focusedOrbIndex = null;
	} else {
		focusedOrbIndex = Math.min(appliedIndex, orbFocusEntries.length - 1);
		applyFocus(focusedOrbIndex);
	}

	return true;
};
