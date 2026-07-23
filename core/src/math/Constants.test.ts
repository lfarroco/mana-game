/// <reference types="jest" />

import * as Constants from "./Constants";

describe("Constants", () => {
	it("TIMEOUT_DAMAGE_START_TIME is a positive number", () => {
		expect(Constants.TIMEOUT_DAMAGE_START_TIME).toBeGreaterThan(0);
		expect(Constants.TIMEOUT_DAMAGE_START_TIME).toBe(30000);
	});

	it("MAX_PARTY_SIZE is 9", () => {
		expect(Constants.MAX_PARTY_SIZE).toBe(9);
	});

	it("FORCE_ID_PLAYER is 'PLAYER'", () => {
		expect(Constants.FORCE_ID_PLAYER).toBe("PLAYER");
	});

	it("FORCE_ID_CPU is 'CPU'", () => {
		expect(Constants.FORCE_ID_CPU).toBe("CPU");
	});

	it("MIN_COOLDOWN is a positive number", () => {
		expect(Constants.MIN_COOLDOWN).toBeGreaterThan(0);
		expect(Constants.MIN_COOLDOWN).toBe(200);
	});
});
