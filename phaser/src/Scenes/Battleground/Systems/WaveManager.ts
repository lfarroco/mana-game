import { BattlegroundScene } from "../BattlegroundScene";
import runWaveIO from "../RunWave";
import { Adventure } from "../../../Models/Adventure";
import { delay } from "../../../Utils/animation";
import { updateProgressBar } from "./ProgressBar";
import { vignette } from "../Animations/vignette";
import { showGrid } from "./GridSystem";
import { refreshScene } from "../EventHandlers";

export let scene: BattlegroundScene;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export type AdventureOutcome = "success" | "failure";

export async function runAdventure(
	adventure: Adventure,
): Promise<AdventureOutcome> {

	const currentWave = adventure.waves[adventure.currentWave - 1];

	updateProgressBar(adventure);

	await delay(scene, 1000 / scene.state.options.speed);

	scene.state.battleData.units =
		scene.state.battleData.units.concat(currentWave.generate())

	const result = await runWaveIO(scene);

	if (result === "player_won") {
		adventure.currentWave++;
		const nextWave = adventure.waves[adventure.currentWave - 1];

		if (nextWave) {
			scene.state.battleData.units =
				scene.state.battleData.units.filter(u => u.hp > 0);
			await vignette(scene, "Next Wave!");
			return runAdventure(adventure);
		} else {
			showGrid();
			refreshScene(scene);

			await vignette(scene, "Finished!");
			await delay(scene, 1000 / scene.state.options.speed);
			return "success";
		}
	}

	if (result === "player_lost") {

		await vignette(scene, "End of Run!");
		await delay(scene, 1000 / scene.state.options.speed);
		refreshScene(scene);

		return "failure";
	}

	throw new Error("Invalid result from runWaveIO");

}
