import { TraitData } from "../../TraitSystem/Traits";
import { TraitDefinition } from "../../TraitSystem/TraitEffectSystem";

/**
 * Formats a trait's description for display in a tooltip, using BBCode for styling.
 * It replaces placeholders like `{key}` in the description with values from the trait data.
 *
 * @param definition The static definition of the trait.
 * @param data The instance-specific data of the trait on a unit.
 * @returns A formatted string with BBCode for the tooltip.
 */
export function formatTraitDescription(definition: TraitDefinition, data: TraitData): string {
	let desc = definition.description;

	// Find all placeholders like {key}
	const placeholders = desc.match(/\{(\w+)\}/g);

	if (placeholders) {
		placeholders.forEach(placeholder => {
			// Get 'key' from '{key}'
			const key = placeholder.substring(1, placeholder.length - 1);

			// Value can come from the trait instance data, or fallback to the first effect's data.
			const value = data[key] ?? definition.effects[0]?.[key];

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