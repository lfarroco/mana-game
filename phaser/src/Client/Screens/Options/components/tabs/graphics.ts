import { getOption, setOption } from "@Models/OptionsStore";
import { multipleChoice } from "Client/Screens/Options/components/controls/multipleChoice";
import { t } from "@i18n/i18n";

type ParticlesOption = "low" | "medium" | "high";

export function graphicsTab(startY: number) {
	return multipleChoice(
		t("options.graphics.particles"),
		startY,
		["low", "medium", "high"] as ParticlesOption[],
		() => getOption("particles", "medium"),
		(value) => {
			setOption("particles", value as ParticlesOption);

			// TODO: update this
			//scene.cloudsBackground.updateParticleQuality();
		},
		(value) => t("options.graphics.values." + value)
	);
}
