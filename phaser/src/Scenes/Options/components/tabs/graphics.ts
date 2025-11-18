import { getOption, setOption } from "@Models/OptionsStore";
import { getCurrentScene } from "@Models/State";
import OptionsScene from "../../OptionsScene";
import { multipleChoice } from "../controls/multipleChoice";

type ParticlesOption = "low" | "medium" | "high";

export function graphicsTab(startY: number) {
	return multipleChoice(
		"Particles",
		startY,
		["low", "medium", "high"] as ParticlesOption[],
		() => getOption("particles", "medium"),
		(value) => {
			setOption("particles", value as ParticlesOption);

			const scene = getCurrentScene() as OptionsScene;
			scene.cloudsBackground.updateParticleQuality();
		}
	);
}
