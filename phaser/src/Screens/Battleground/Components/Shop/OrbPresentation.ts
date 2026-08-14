/**
 * Orb Presentation Layer
 *
 * Maps orb IDs → UI presentation data (name, tooltip, color, icon).
 * Reads from the pure orb data registry in core; no dummy RNG, no
 * effect instantiation.
 */

import { ORB_PRESENTATION_DATA } from "@game/content/orbPresentations";
import * as i18n from "@i18n/i18n";

export type OrbPresentation = {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	icon: string;
};

// Resolved at module load from the pure core registry (preserves the current
// module-load i18n freezing behavior).
const ORB_PRESENTATIONS: Record<string, OrbPresentation> = {};
for (const data of Object.values(ORB_PRESENTATION_DATA)) {
	ORB_PRESENTATIONS[data.id] = {
		id: data.id,
		name: i18n.t(data.nameKey, data.params),
		color: data.color,
		tooltip: i18n.t(data.tooltipKey, data.params),
		icon: data.icon,
	};
}

export function getOrbPresentation(orbId: string): OrbPresentation {
	const spec = ORB_PRESENTATIONS[orbId];
	if (spec) return spec;
	return { id: orbId, name: orbId, color: 0x888888, tooltip: orbId, icon: "ui/upgrade_unit" };
}
