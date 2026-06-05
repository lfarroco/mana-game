import * as CloudsBackground from "Client/Components/cloudBackground/CloudsBackground";

import * as config from "@config"

export function create() {
	if (config.DISABLE_ASSETS) return null;

	new CloudsBackground.CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});
}