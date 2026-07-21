import { getSettings, setOption } from "@Models/OptionsStore";
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

			// TODO: update this
			//scene.cloudsBackground.updateParticleQuality();
		},
		(value) => t("options.graphics.values." + value)
	);
}
