import { beforeAll, describe, expect, it } from "@jest/globals";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { registerCollection } from "@Models/Entities/Card";
import { createInitialSession } from "@Core/SessionManagement";
import { transitionToNextState } from "@Core/SessionTransitions";

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

describe("transitionToNextState", () => {
	it("advances encounter and shop with the generic skip action", () => {
		const encounterSession = createInitialSession("p1", "crystal_core", "test-generic-skip");

		const shopSession = transitionToNextState(encounterSession, "skip").session;
		const shopSkipAction = shopSession.action_log[shopSession.action_log.length - 1];

		expect(shopSession.phase).toBe("shop");
		expect(shopSession.current_options.length).toBeGreaterThan(0);
		expect(shopSkipAction?.actionId).toBe("skip");

		const nextEncounterSession = transitionToNextState(shopSession, "skip").session;
		const nextSkipAction = nextEncounterSession.action_log[nextEncounterSession.action_log.length - 1];

		expect(nextEncounterSession.phase).toBe("encounter");
		expect(nextEncounterSession.step).toBe(shopSession.step + 1);
		expect(nextSkipAction?.actionId).toBe("skip");
	});
});