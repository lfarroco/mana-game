import * as CloudsBackground from "@Components/CloudsBackground/CloudsBackground";

import * as config from "@config";
import { env } from "@Env";

export function create() {
	if (config.DISABLE_ASSETS) return env.container();

	return new CloudsBackground.CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});
}
