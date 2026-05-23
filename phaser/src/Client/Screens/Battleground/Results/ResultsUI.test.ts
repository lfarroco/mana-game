import { describe, expect, it } from "@jest/globals";
import { determineGameOutcome } from "Client/Screens/Battleground/Results/ResultsOutcome";

describe("ResultsUI determineGameOutcome", () => {
	it("does not end the run on the third loss (1 life remaining)", () => {
		const outcome = determineGameOutcome("defeat", 5, 1);
		expect(outcome.gameOver).toBe(false);
		expect(outcome.gameWon).toBe(false);
	});

	it("ends the run on the fourth loss (0 lives remaining)", () => {
		const outcome = determineGameOutcome("defeat", 5, 0);
		expect(outcome.gameOver).toBe(true);
		expect(outcome.gameWon).toBe(false);
	});

	it("does not trigger game win before reaching the target wins", () => {
		const outcome = determineGameOutcome("victory", 9, 4);
		expect(outcome.gameWon).toBe(false);
		expect(outcome.gameOver).toBe(false);
	});

	it("triggers game win at the target wins", () => {
		const outcome = determineGameOutcome("victory", 10, 4);
		expect(outcome.gameWon).toBe(true);
		expect(outcome.gameOver).toBe(false);
	});
});
