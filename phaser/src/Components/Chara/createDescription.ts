import { Chara, getUnit } from "@Components/Chara/Chara";
import { t } from "@i18n/i18n";
import { getSettings } from "@Models/OptionsStore";
import { buildUnitDescription } from "@game/descriptions/unitDescription";

export function createDescription(chara: Chara) {
	const unit = getUnit(chara);
	return buildUnitDescription(unit, t, getSettings().compactTooltips);
}
