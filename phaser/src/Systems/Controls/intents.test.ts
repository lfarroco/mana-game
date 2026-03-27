import {
	GAMEPAD_AXIS_THRESHOLD,
	resolveGamepadIntents,
	resolveKeyboardIntents,
} from "@Systems/Controls/intents";
import { State } from "@Models/State";

const buildState = (phase: State["session"]["phase"], optionIds: string[] = []): State => ({
	savedGames: [],
	session: {
		id: "session",
		player_id: "player",
		phase,
		round: 1,
		step: 0,
		seed: "1",
		initial_seed: "1",
		current_options: { options: optionIds.map((id) => ({ id })) },
		team: { units: [] },
		wins: 0,
		losses: 0,
		action_log: [],
		encounter_history: [],
		runStats: {
			damageDealt: 0,
			poisonDealt: 0,
			shieldDealt: 0,
			regenDealt: 0,
			healDealt: 0,
			mostPowerfulUnit: null,
			totalUnitsRecruited: 0,
			unitUsage: {},
		},
	},
	battleData: {
		forces: [],
		grid: [],
		units: [],
	},
});

describe("resolveKeyboardIntents", () => {
	it("maps arrows and enter for button contexts", () => {
		expect(resolveKeyboardIntents("buttons", buildState("encounter"), "ArrowDown")).toEqual([
			{ type: "navigateButtons", direction: "down" },
		]);
		expect(resolveKeyboardIntents("buttons", buildState("encounter"), "Tab")).toEqual([
			{ type: "navigateButtons", direction: "down" },
		]);
		expect(resolveKeyboardIntents("buttons", buildState("encounter"), "Enter")).toEqual([
			{ type: "confirm" },
		]);
		expect(resolveKeyboardIntents("buttons", buildState("encounter"), "Escape")).toEqual([
			{ type: "cancel" },
		]);
	});

	it("keeps battleground shortcuts available", () => {
		expect(resolveKeyboardIntents("battleground", buildState("shop"), "Tab")).toEqual([
			{ type: "cycleLayer" },
		]);
		expect(resolveKeyboardIntents("battleground", buildState("shop"), "ArrowLeft")).toEqual([
			{ type: "navigateBoard", direction: "left" },
		]);
		expect(resolveKeyboardIntents("battleground", buildState("shop", ["hero_a"]), "1")).toEqual([
			{ type: "shortcut", action: { type: "purchaseUnit", optionId: "hero_a" } },
		]);
		expect(resolveKeyboardIntents("battleground", buildState("shop"), " ")).toEqual([
			{ type: "shortcut", action: { type: "skipPhase" } },
		]);
	});
});

describe("resolveGamepadIntents", () => {
	it("maps d-pad and confirm/cancel buttons", () => {
		const intents = resolveGamepadIntents(
			"buttons",
			buildState("encounter"),
			{
				buttons: [true, true, false, false, false, false, false, false, false, false, false, false, true, false, false, false],
				leftStickX: 0,
				leftStickY: 0,
			},
			{
				buttons: new Array(16).fill(false),
				leftStickX: 0,
				leftStickY: 0,
			}
		);

		expect(intents).toEqual([
			{ type: "navigateButtons", direction: "up" },
			{ type: "confirm" },
			{ type: "cancel" },
		]);
	});

	it("maps stick edges and battleground skip", () => {
		const intents = resolveGamepadIntents(
			"battleground",
			buildState("shop"),
			{
				buttons: [false, false, false, true],
				leftStickX: GAMEPAD_AXIS_THRESHOLD + 0.1,
				leftStickY: 0,
			},
			{
				buttons: [false, false, false, false],
				leftStickX: 0,
				leftStickY: 0,
			}
		);

		expect(intents).toEqual([
			{ type: "navigateBoard", direction: "right" },
			{ type: "shortcut", action: { type: "skipPhase" } },
		]);
	});

	it("maps battleground shoulder buttons to layer cycling", () => {
		const intents = resolveGamepadIntents(
			"battleground",
			buildState("shop"),
			{
				buttons: [false, false, false, false, true, false],
				leftStickX: 0,
				leftStickY: 0,
			},
			{
				buttons: [false, false, false, false, false, false],
				leftStickX: 0,
				leftStickY: 0,
			}
		);

		expect(intents).toEqual([{ type: "cycleLayer" }]);
	});
});