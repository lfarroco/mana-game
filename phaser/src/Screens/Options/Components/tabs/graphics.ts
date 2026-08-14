import { getSettings, setOption } from "@Models/OptionsStore";
import * as CloudsBackground from "@Components/CloudsBackground/CloudsBackground";
import { multipleChoice } from "@Screens/Options/Components/controls/multipleChoice";
import { t } from "@i18n/i18n";

type ParticlesOption = "low" | "medium" | "high";

export function graphicsTab(startY: number) {
	return multipleChoice(
		t("options.graphics.particles"),
		startY,
		["low", "medium", "high"] as ParticlesOption[],
		() => getSettings().particles,
		(value) => {
			setOption("particles", value as ParticlesOption);

			// Push the new quality to the live background (e.g. the aurora
			// background behind this screen) so the change applies immediately.
			CloudsBackground.getActiveInstance()?.updateParticleQuality();
		},
		(value) => t("options.graphics.values." + value)
	);
}
