import {
	INFINITE_MODE_THRESHOLD,
	shouldOfferInfiniteMode,
	type InfiniteModeEligibility,
} from "./ResultsConfig";

/**
 * Unit tests for the run-complete "Infinite Mode" eligibility rule.
 *
 * Multiplayer differs from single-player: a multiplayer run ends at
 * WINS_TO_WIN_GAME and the server never accepts the "victory" action that
 * infinite mode dispatches, so the option must never be offered there —
 * the player can only start a new run.
 */

function eligibility(overrides: Partial<InfiniteModeEligibility> = {}): InfiniteModeEligibility {
	return {
		wins: INFINITE_MODE_THRESHOLD,
		isGameOver: false,
		isDemo: false,
		isMultiplayer: false,
		...overrides,
	};
}

describe("shouldOfferInfiniteMode", () => {
	it("offers infinite mode on a single-player victory at the threshold", () => {
		expect(shouldOfferInfiniteMode(eligibility())).toBe(true);
		expect(shouldOfferInfiniteMode(eligibility({ wins: INFINITE_MODE_THRESHOLD + 1 }))).toBe(true);
	});

	it("does not offer infinite mode below the win threshold", () => {
		expect(shouldOfferInfiniteMode(eligibility({ wins: INFINITE_MODE_THRESHOLD - 1 }))).toBe(false);
	});

	it("does not offer infinite mode on a game-over screen", () => {
		expect(shouldOfferInfiniteMode(eligibility({ isGameOver: true }))).toBe(false);
	});

	it("does not offer infinite mode in the demo build", () => {
		expect(shouldOfferInfiniteMode(eligibility({ isDemo: true }))).toBe(false);
	});

	it("never offers infinite mode in multiplayer, even at 10+ wins", () => {
		expect(shouldOfferInfiniteMode(eligibility({ isMultiplayer: true }))).toBe(false);
		expect(
			shouldOfferInfiniteMode(
				eligibility({ wins: INFINITE_MODE_THRESHOLD + 5, isMultiplayer: true })
			)
		).toBe(false);
	});
});
