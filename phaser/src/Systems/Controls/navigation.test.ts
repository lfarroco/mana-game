import { findNextFocusable } from "@Systems/Controls/navigation";

const entries = [
	{ id: "one", x: 100, y: 100 },
	{ id: "two", x: 100, y: 200 },
	{ id: "three", x: 220, y: 200 },
	{ id: "four", x: 100, y: 320 },
];

describe("findNextFocusable", () => {
	it("selects the first item when there is no current focus", () => {
		expect(findNextFocusable(entries, null, "down")).toEqual(entries[0]);
	});

	it("moves vertically using nearest candidate", () => {
		expect(findNextFocusable(entries, "one", "down")).toEqual(entries[1]);
		expect(findNextFocusable(entries, "four", "up")).toEqual(entries[1]);
	});

	it("moves horizontally using nearest candidate", () => {
		expect(findNextFocusable(entries, "two", "right")).toEqual(entries[2]);
		expect(findNextFocusable(entries, "three", "left")).toEqual(entries[1]);
	});

	it("wraps when there is no candidate in the requested direction", () => {
		expect(findNextFocusable(entries, "one", "up")).toEqual(entries[3]);
		expect(findNextFocusable(entries, "three", "right")).toEqual(entries[0]);
	});
});