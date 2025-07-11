import { TraitData } from "../../TraitSystem/Traits";
import { TraitDefinition } from "../../TraitSystem/TraitEffectSystem";
import { Unit } from "../../Models/Entities/Unit";

/**
 * Formats a trait's description for display in a tooltip, using BBCode for styling.
 * It replaces placeholders like `{key}` in the description with values from the trait data.
 * For certain placeholders like `{amount}`, it can fall back to unit properties when not found in trait data.
 *
 * @param definition The static definition of the trait.
 * @param data The instance-specific data of the trait on a unit.
 * @param unit The unit that owns this trait (used for fallback values like power).
 * @returns A formatted string with BBCode for the tooltip.
 */
export function formatTraitDescription(definition: TraitDefinition, data: TraitData, unit?: Unit): string {
	let desc = definition.description;

	// Find all placeholders like {key}
	const placeholders = desc.match(/\{(\w+)\}/g);

	if (placeholders) {
		placeholders.forEach(placeholder => {
			// Get 'key' from '{key}'
			const key = placeholder.substring(1, placeholder.length - 1);

			// Value can come from the trait instance data, or fallback to the first effect's data.
			let value = data[key] ?? definition.effects[0]?.[key];

			// Special handling for {amount} - if not found and we have a unit, use unit's power
			if (value === undefined && key === 'amount' && unit) {
				value = unit.power;
			}

			if (value !== undefined) {
				// Replace placeholder with a bolded, yellow value.
				const replacement = `[b][color=yellow]${value}[/color][/b]`;
				desc = desc.replace(placeholder, replacement);
			}
		});
	}

	// Return the formatted string with the trait name in bold.
	return `[b]${definition.name}:[/b] ${desc}`;
}