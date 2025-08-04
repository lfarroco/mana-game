/**
 * Tests for the simplified direct effect system in trait processing.
 * This tests the ability to use direct effectId + eventTrigger without trait definitions.
 */
import { processUnitTraitsForEvent, TraitData } from "./Traits";
import { registerTraitEffectImplementation, TraitEffectContext } from "./TraitEffectSystem";
import { createTestUnit } from "../Models/Entities/Unit";
import { State } from "../Models/State";

// Mock implementation for testing
const mockDealDamage = jest.fn(async (_context: TraitEffectContext) => {
	// Mock implementation - just record that it was called
});

// Mock scene - minimal implementation for testing
const mockScene = {
	scene: {
		get: () => mockScene
	}
} as any;

// Helper to create mock state
function createMockState(): State {
	return {
		battleData: {
			forces: [
				{ id: "player", morale: 10 },
				{ id: "cpu", morale: 10 },
			],
			units: [
				createTestUnit("player_unit", "player"),
				createTestUnit("enemy_unit", "cpu")
			]
		},
		gameData: { player: { id: "player" } },
	} as any;
}

describe("Direct Effect System", () => {
	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Register our mock effect implementation
		registerTraitEffectImplementation("deal_damage", mockDealDamage);
	});

	it("should process direct effect traits (bypassing trait definitions)", () => {
		// Create a unit with a direct effect trait
		const unit = createTestUnit("test_unit", "player");
		const directEffectTrait: TraitData = {
			effectId: "deal_damage",
			eventTrigger: "onAction"
		};
		unit.traits = [directEffectTrait];

		const state = createMockState();

		// Process the trait event
		processUnitTraitsForEvent(unit, "onAction", mockScene, state);

		// Verify that the effect implementation was called
		expect(mockDealDamage).toHaveBeenCalledTimes(1);
		expect(mockDealDamage).toHaveBeenCalledWith(
			expect.objectContaining({
				sourceUnit: unit,
				effectInstance: expect.objectContaining({
					effectId: "deal_damage",
					eventTrigger: "onAction"
				}),
				traitInstanceParams: directEffectTrait,
				scene: mockScene,
				state: state
			})
		);
	});

	it("should not process direct effects when event doesn't match", () => {
		const unit = createTestUnit("test_unit", "player");
		const directEffectTrait: TraitData = {
			effectId: "deal_damage",
			eventTrigger: "onAction"
		};
		unit.traits = [directEffectTrait];

		const state = createMockState();

		// Process a different event
		processUnitTraitsForEvent(unit, "onBattleStart", mockScene, state);

		// Verify that the effect implementation was NOT called
		expect(mockDealDamage).not.toHaveBeenCalled();
	});

	it("should pass through parameters correctly for direct effects", () => {
		const unit = createTestUnit("test_unit", "player");
		const directEffectTrait: TraitData = {
			effectId: "deal_damage",
			eventTrigger: "onAction",
			amount: 25,
			targets: "random_enemy"
		};
		unit.traits = [directEffectTrait];

		const state = createMockState();

		processUnitTraitsForEvent(unit, "onAction", mockScene, state);

		expect(mockDealDamage).toHaveBeenCalledWith(
			expect.objectContaining({
				effectInstance: expect.objectContaining({
					effectId: "deal_damage",
					eventTrigger: "onAction",
					amount: 25,
					targets: "random_enemy"
				}),
				traitInstanceParams: directEffectTrait
			})
		);
	});

	it("should warn when effectId is provided but no implementation exists", () => {
		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

		const unit = createTestUnit("test_unit", "player");
		const directEffectTrait: TraitData = {
			effectId: "nonexistent_effect",
			eventTrigger: "onAction"
		};
		unit.traits = [directEffectTrait];

		const state = createMockState();

		processUnitTraitsForEvent(unit, "onAction", mockScene, state);

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Implementation not found for direct effectId: nonexistent_effect"),
			expect.stringContaining("Source: Unit: test_unit")
		);

		consoleSpy.mockRestore();
	});

	it("should warn when trait has neither id nor effectId", () => {
		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

		const unit = createTestUnit("test_unit", "player");
		const invalidTrait: TraitData = {
			// Missing both id and effectId
			amount: 10
		};
		unit.traits = [invalidTrait];

		const state = createMockState();

		processUnitTraitsForEvent(unit, "onAction", mockScene, state);

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Trait instance missing both 'id' and 'effectId' on Unit test_unit:"),
			expect.objectContaining({ amount: 10 })
		);

		consoleSpy.mockRestore();
	});
});
