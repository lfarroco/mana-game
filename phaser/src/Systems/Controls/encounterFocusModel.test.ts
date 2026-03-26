import { getNextEncounterFocusIndex } from "@Systems/Controls/encounterFocusModel";

describe("getNextEncounterFocusIndex", () => {
	it("returns null when no items exist", () => {
		expect(getNextEncounterFocusIndex(null, 0, "down")).toBeNull();
	});

	it("selects first item when starting with no focus", () => {
		expect(getNextEncounterFocusIndex(null, 3, "down")).toBe(0);
	});

	it("moves forward for down/right and wraps", () => {
		expect(getNextEncounterFocusIndex(0, 3, "down")).toBe(1);
		expect(getNextEncounterFocusIndex(2, 3, "right")).toBe(0);
	});

	it("moves backward for up/left and wraps", () => {
		expect(getNextEncounterFocusIndex(2, 3, "up")).toBe(1);
		expect(getNextEncounterFocusIndex(0, 3, "left")).toBe(2);
	});
});