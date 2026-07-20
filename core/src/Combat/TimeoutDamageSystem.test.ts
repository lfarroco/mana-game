/// <reference types="jest" />

import * as Timeout from "../Combat/TimeoutDamageSystem";
import * as Constants from "../Constants";

describe("TimeoutDamageSystem", () => {
	describe("initializeTimeoutDamageSystem", () => {
		it("creates an active system with zero elapsed", () => {
			const state = Timeout.initializeTimeoutDamageSystem();
			expect(state.isActive).toBe(true);
			expect(state.combatElapsedTime).toBe(0);
			expect(state.timeSinceLastTick).toBe(0);
			expect(state.stormStarted).toBe(false);
		});
	});

	describe("stopTimeoutDamageSystem", () => {
		it("sets isActive to false", () => {
			const state = Timeout.initializeTimeoutDamageSystem();
			const stopped = Timeout.stopTimeoutDamageSystem(state);
			expect(stopped.isActive).toBe(false);
			expect(stopped.combatElapsedTime).toBe(state.combatElapsedTime);
		});

		it("does not mutate original state", () => {
			const state = Timeout.initializeTimeoutDamageSystem();
			Timeout.stopTimeoutDamageSystem(state);
			expect(state.isActive).toBe(true);
		});
	});

	describe("onTimeoutDamageCombatEnd", () => {
		it("sets isActive to false if active", () => {
			const state = Timeout.initializeTimeoutDamageSystem();
			const result = Timeout.onTimeoutDamageCombatEnd(state);
			expect(result.isActive).toBe(false);
		});

		it("returns already-inactive state unchanged", () => {
			const active = Timeout.initializeTimeoutDamageSystem();
			const stopped = Timeout.stopTimeoutDamageSystem(active);
			const result = Timeout.onTimeoutDamageCombatEnd(stopped);
			expect(result.isActive).toBe(false);
			expect(result).toBe(stopped);
		});
	});

	describe("getTimeoutDamageConfig", () => {
		it("returns config from state", () => {
			const state = Timeout.initializeTimeoutDamageSystem();
			const config = Timeout.getTimeoutDamageConfig(state);
			expect(config.timeoutDamageStartTime).toBe(Constants.TIMEOUT_DAMAGE_START_TIME);
			expect(config.timeoutDamageInterval).toBe(1000);
			expect(config.isActive).toBe(true);
			expect(config.combatElapsed).toBe(0);
			expect(config.stormState.stormStarted).toBe(false);
		});

		it("reports stormStarted when elapsed >= start time", () => {
			// Simulate state past the start time
			const state: Timeout.TimeoutSystemState = {
				combatElapsedTime: Constants.TIMEOUT_DAMAGE_START_TIME + 1000,
				timeSinceLastTick: 500,
				isActive: true,
				stormStarted: true,
			};
			const config = Timeout.getTimeoutDamageConfig(state);
			expect(config.stormState.stormStarted).toBe(true);
		});

		it("reports isActive from state", () => {
			const active = Timeout.initializeTimeoutDamageSystem();
			const stopped = Timeout.stopTimeoutDamageSystem(active);
			expect(Timeout.getTimeoutDamageConfig(active).isActive).toBe(true);
			expect(Timeout.getTimeoutDamageConfig(stopped).isActive).toBe(false);
		});
	});
});
