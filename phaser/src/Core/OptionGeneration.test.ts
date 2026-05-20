import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { generateShopOptions } from "@Core/OptionGeneration";
import { createInitialSession } from "@Core/SessionManagement";
import { getCardDefinition, registerCollection } from "@Models/Entities/Card";

const TYPE_SPECIFIC_STORE_IDS = [
	"armory",
	"healing_tent",
	"frontier_fort",
	"forest_pools",
	"toxic_chamber",
	"trial_circuit",
	"trappers_guild",
	"thunder_spire",
	"commanders_tent",
	"assassins_hideout",
] as const;

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

describe("generateShopOptions", () => {
	it.each(TYPE_SPECIFIC_STORE_IDS)("returns only bronze units for %s", (encounterId) => {
		const session = createInitialSession("p1", "crystal_core", `test-${encounterId}`);

		const { options } = generateShopOptions(session, encounterId);

		expect(options.length).toBeGreaterThan(0);
		options.forEach((option) => {
			const card = getCardDefinition(option.id);
			expect(card.rank ?? 1).toBe(1);
			expect("recruitRank" in option ? option.recruitRank : undefined).toBe(1);
		});
	});

	it("keeps silver shop limited to two rank 2 options", () => {
		const session = createInitialSession("p1", "crystal_core", "test-silver-shop");

		const { options } = generateShopOptions(session, "silver_shop");

		expect(options).toHaveLength(2);
		options.forEach((option) => {
			const card = getCardDefinition(option.id);
			expect(card.rank ?? 1).toBe(2);
			expect("recruitRank" in option ? option.recruitRank : undefined).toBe(2);
		});
	});

	it("keeps gold shop limited to one rank 3 option", () => {
		const session = createInitialSession("p1", "crystal_core", "test-gold-shop");

		const { options } = generateShopOptions(session, "gold_shop");

		expect(options).toHaveLength(1);
		const card = getCardDefinition(options[0].id);
		expect(card.rank ?? 1).toBe(3);
		expect("recruitRank" in options[0] ? options[0].recruitRank : undefined).toBe(3);
	});
});