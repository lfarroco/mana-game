import { formatTraitDescription } from "./TraitTooltipFormatter";
import { TraitDefinition } from "../../TraitSystem/TraitEffectSystem";
import { TraitData } from "../../TraitSystem/Traits";
import { Unit } from "../../Models/Entities/Unit";

describe("TraitTooltipFormatter", () => {
	describe("formatTraitDescription", () => {
		it("should use trait data amount when available", () => {
			const definition: TraitDefinition = {
				id: "test_trait" as any,
				name: "Test Trait",
				description: "Does {amount} damage",
				categories: ["offensive"],
				effects: []
			};

			const traitData: TraitData = {
				id: "test_trait" as any,
				amount: 15
			};

			const unit: Unit = {
				id: "unit1",
				power: 25,
				// ... other Unit properties would be here
			} as Unit;

			const result = formatTraitDescription(definition, traitData, unit);

			expect(result).toContain("[b][color=yellow]15[/color][/b]");
			expect(result).not.toContain("{amount}");
		});

		it("should fall back to unit power when amount is not in trait data", () => {
			const definition: TraitDefinition = {
				id: "damage" as any,
				name: "Damage Dealer",
				description: "Deal [color=red]{amount} damage[/color]",
				categories: ["offensive"],
				effects: [{
					effectId: "deal_damage",
					eventTrigger: "onAction"
				}]
			};

			const traitData: TraitData = {
				id: "damage" as any
				// No amount property
			};

			const unit: Unit = {
				id: "unit1",
				power: 30,
				// ... other Unit properties would be here
			} as Unit;

			const result = formatTraitDescription(definition, traitData, unit);

			expect(result).toContain("[b][color=yellow]30[/color][/b]");
			expect(result).not.toContain("{amount}");
		});

		it("should work without unit parameter for backward compatibility", () => {
			const definition: TraitDefinition = {
				id: "test_trait" as any,
				name: "Test Trait",
				description: "Does {amount} damage",
				categories: ["offensive"],
				effects: []
			};

			const traitData: TraitData = {
				id: "test_trait" as any,
				amount: 20
			};

			const result = formatTraitDescription(definition, traitData);

			expect(result).toContain("[b][color=yellow]20[/color][/b]");
			expect(result).not.toContain("{amount}");
		});

		it("should leave placeholder when no value found and no unit provided", () => {
			const definition: TraitDefinition = {
				id: "test_trait" as any,
				name: "Test Trait",
				description: "Does {amount} damage",
				categories: ["offensive"],
				effects: []
			};

			const traitData: TraitData = {
				id: "test_trait" as any
				// No amount property
			};

			const result = formatTraitDescription(definition, traitData);

			expect(result).toContain("{amount}");
		});

		it("should use effect data as fallback", () => {
			const definition: TraitDefinition = {
				id: "test_trait" as any,
				name: "Test Trait",
				description: "Does {amount} damage",
				categories: ["offensive"],
				effects: [{
					effectId: "deal_damage",
					eventTrigger: "onAction",
					amount: 12
				}]
			};

			const traitData: TraitData = {
				id: "test_trait" as any
				// No amount property
			};

			const result = formatTraitDescription(definition, traitData);

			expect(result).toContain("[b][color=yellow]12[/color][/b]");
			expect(result).not.toContain("{amount}");
		});
	});
});
