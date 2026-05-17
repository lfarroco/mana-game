import { DEMO_CONFIG, FULL_CONFIG, GAME_CONFIG } from "@config";

describe("controller support config", () => {
	it("disables controller support in all build variants", () => {
		expect(DEMO_CONFIG.ENABLE_CONTROLLER_SUPPORT).toBe(false);
		expect(FULL_CONFIG.ENABLE_CONTROLLER_SUPPORT).toBe(false);
		expect(GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT).toBe(false);
	});
});
