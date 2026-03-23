import { resolveAction } from "./ActionResolver";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { createInitialSession } from "@Core/SessionManagement";
import { transitionToNextState } from "@Core/SessionTransitions";

// Polyfill structuredClone for Jest environment
if (typeof global.structuredClone === "undefined") {
	global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
}

jest.mock("../../i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (key: string) => key,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

const CARD_ID = "void_witch";

describe("resolveAction - unit recruitment", () => {
	it("includes the newly recruited unit in the returned team", () => {
		const session = createInitialSession("p1", "crystal_core", "test-recruit-seed");

		const { team } = resolveAction(session, CARD_ID);

		const recruited = team.units.find((u) => u.cardId === CARD_ID);
		expect(recruited).toBeDefined();
		expect(recruited!.cardId).toBe(CARD_ID);
	});

	it("does not mutate the original session team when recruiting", () => {
		const session = createInitialSession("p1", "crystal_core", "test-recruit-seed");
		const originalUnitCount = session.team.units.length;

		resolveAction(session, CARD_ID);

		expect(session.team.units).toHaveLength(originalUnitCount);
		expect(session.team.units.find((u) => u.cardId === CARD_ID)).toBeUndefined();
	});

	it("upgrades an existing unit's rank when the same card is recruited again", () => {
		const session = createInitialSession("p1", "crystal_core", "test-upgrade-seed");

		const { team: teamAfterFirst } = resolveAction(session, CARD_ID);
		const unit = teamAfterFirst.units.find((u) => u.cardId === CARD_ID);
		expect(unit).toBeDefined();
		expect(unit!.rank).toBe(1);

		const sessionAfterFirst = { ...session, team: teamAfterFirst };
		const { team: teamAfterUpgrade } = resolveAction(sessionAfterFirst, CARD_ID);
		const upgraded = teamAfterUpgrade.units.find((u) => u.cardId === CARD_ID);
		expect(upgraded).toBeDefined();
		expect(upgraded!.rank).toBe(2);
	});
});

describe("transitionToNextState - unit recruitment", () => {
	it("adds the recruited unit to the session team after a shop purchase", () => {
		const session = createInitialSession("p1", "crystal_core", "test-shop-seed");
		const shopSession = {
			...session,
			phase: "shop" as const,
			current_options: { options: [{ id: CARD_ID }] },
		};

		const { session: next } = transitionToNextState(shopSession, CARD_ID);

		const recruited = next.team.units.find((u) => u.cardId === CARD_ID);
		expect(recruited).toBeDefined();
		expect(recruited!.cardId).toBe(CARD_ID);
	});

	it("does not mutate the original session when transitioning with a purchase", () => {
		const session = createInitialSession("p1", "crystal_core", "test-shop-immutable");
		const originalUnitCount = session.team.units.length;
		const shopSession = {
			...session,
			phase: "shop" as const,
			current_options: { options: [{ id: CARD_ID }] },
		};

		transitionToNextState(shopSession, CARD_ID);

		expect(session.team.units).toHaveLength(originalUnitCount);
	});
});
