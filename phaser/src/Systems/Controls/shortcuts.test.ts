import { State } from "@Models/State";
import { resolveShortcutAction, shouldIgnoreShortcutEvent } from "@Systems/Controls/shortcuts";

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

describe("resolveShortcutAction", () => {
	it("maps space to skip for skippable phases", () => {
		expect(resolveShortcutAction(buildState("encounter"), " ")).toEqual({ type: "skipPhase" });
		expect(resolveShortcutAction(buildState("shop"), " ")).toEqual({ type: "skipPhase" });
		expect(resolveShortcutAction(buildState("upgrade_core"), " ")).toEqual({ type: "skipPhase" });
	});

	it("ignores space for non-skippable phases", () => {
		expect(resolveShortcutAction(buildState("combat"), " ")).toBeNull();
		expect(resolveShortcutAction(buildState("victory"), " ")).toBeNull();
	});

	it("maps digits to encounter choices", () => {
		expect(resolveShortcutAction(buildState("encounter", ["armory", "healing_tent"]), "2")).toEqual(
			{
				type: "selectEncounter",
				optionId: "healing_tent",
			}
		);
	});

	it("maps digits to shop purchases", () => {
		expect(resolveShortcutAction(buildState("shop", ["hero_a", "hero_b"]), "1")).toEqual({
			type: "purchaseUnit",
			optionId: "hero_a",
		});
	});

	it("maps digits to upgrade actions", () => {
		expect(
			resolveShortcutAction(
				buildState("add_reaction_core", ["on_crit_effect", "on_battle_start_effect"]),
				"2"
			)
		).toEqual({
			type: "handleAction",
			optionId: "on_battle_start_effect",
		});
	});

	it("ignores unsupported phases and out-of-range digits", () => {
		expect(resolveShortcutAction(buildState("orb_shop", ["orb_a"]), "1")).toBeNull();
		expect(resolveShortcutAction(buildState("shop", ["hero_a"]), "4")).toBeNull();
	});
});

describe("shouldIgnoreShortcutEvent", () => {
	it("ignores events with modifier keys", () => {
		const event = new KeyboardEvent("keydown", { key: "1", ctrlKey: true });
		expect(shouldIgnoreShortcutEvent(event)).toBe(true);
	});

	it("ignores editable targets", () => {
		const input = document.createElement("input");
		const event = new KeyboardEvent("keydown", { key: "1" });
		Object.defineProperty(event, "target", { value: input });

		expect(shouldIgnoreShortcutEvent(event)).toBe(true);
	});

	it("allows gameplay targets", () => {
		const target = document.createElement("div");
		const event = new KeyboardEvent("keydown", { key: "1" });
		Object.defineProperty(event, "target", { value: target });

		expect(shouldIgnoreShortcutEvent(event)).toBe(false);
	});
});
