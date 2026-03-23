import { phaseValidator } from "@Core/PhaseSystem/PhaseValidator";
import { SessionData } from "@Core/Types";

const createSession = (
	overrides: Partial<SessionData> = {},
	optionIds: string[] = []
): SessionData => ({
	id: "sess-1",
	player_id: "player-1",
	phase: "encounter",
	round: 1,
	step: 1,
	seed: "seed-1",
	initial_seed: "seed-1",
	current_options: { options: optionIds.map((id) => ({ id })) },
	team: { units: [] },
	wins: 0,
	losses: 0,
	action_log: [],
	...overrides,
});

describe("PhaseValidator.validateAction", () => {
	it("rejects skip_shop outside shop phase", () => {
		const session = createSession({ phase: "encounter" }, ["assassins_hideout", "armory"]);
		const result = phaseValidator.validateAction({ session, actionId: "skip_shop" });

		expect(result.valid).toBe(false);
		expect(result.errors[0]).toContain("valid for phase 'shop'");
	});

	it("allows skip_shop in shop phase", () => {
		const session = createSession({ phase: "shop" }, ["unit_a", "unit_b"]);
		const result = phaseValidator.validateAction({ session, actionId: "skip_shop" });

		expect(result.valid).toBe(true);
	});
});
