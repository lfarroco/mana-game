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
	// Use data.description if present, otherwise fall back to definition.description
	let desc = typeof data.description === 'string' ? data.description : definition.description;

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

			// Special handling for parametric traits with {targets} and {position}
			if (value === undefined) {
				switch (key) {
					case 'targets':
						value = formatTargetName(data.targets);
						break;
					case 'position':
						value = formatPositionName(data.position);
						break;
				}
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

/**
 * Converts a target parameter into a user-friendly description
 */
function formatTargetName(targets: any): string {
	if (typeof targets !== 'string') return 'unknown targets';

	switch (targets) {
		case 'left': return 'left ally';
		case 'right': return 'right ally';
		case 'back':
		case 'behind': return 'ally behind';
		case 'front': return 'ally in front';
		case 'adjacent': return 'adjacent allies';
		case 'diagonal': return 'diagonal allies';
		case 'row':
		case 'same_row': return 'allies in row';
		case 'column':
		case 'same_column': return 'allies in column';
		case 'all_allies':
		case 'all': return 'all allies';
		case 'enemy':
		case 'closest_enemy': return 'closest enemy';
		case 'all_enemies': return 'all enemies';
		case 'random_ally': return 'random ally';
		case 'random_enemy': return 'random enemy';
		case 'random_unit': return 'random unit';
		default: return targets;
	}
}

/**
 * Converts a position parameter into a user-friendly description
 */
function formatPositionName(position: any): string {
	if (typeof position !== 'string') return 'unknown position';

	switch (position) {
		case 'front': return 'front row';
		case 'mid': return 'middle row';
		case 'back': return 'back row';
		case 'left': return 'left column';
		case 'right': return 'right column';
		case 'center': return 'center';
		case 'corner': return 'corners';
		case 'edge': return 'board edges';
		case 'isolated': return 'when isolated';
		case 'random_ally': return 'random ally';
		case 'random_enemy': return 'random enemy';
		case 'random_unit': return 'random unit';
		case 'self': return 'self';
		case 'allies_adjacent': return 'adjacent allies';
		case 'allies_diagonal': return 'diagonal allies';
		case 'all_allies_in_row': return 'allies in row';
		case 'all_allies_in_column': return 'allies in column';
		case 'ally_front': return 'ally in front';
		case 'ally_back': return 'ally behind';
		case 'ally_left': return 'left ally';
		case 'ally_right': return 'right ally';
		case 'enemies_adjacent': return 'adjacent enemies';
		case 'enemies_diagonal': return 'diagonal enemies';
		case 'all_enemies_in_row': return 'enemies in row';
		case 'all_enemies_in_column': return 'enemies in column';
		default: return position;
	}
}