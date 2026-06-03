import * as CloudsBackground from "Client/Components/cloudBackground/CloudsBackground";

export function createBackground() {
	new CloudsBackground.CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});
}