import * as CloudsBackground from "Client/Components/cloudBackground/CloudsBackground";
import * as config from "@config"

let backgroundInstance: CloudsBackground.CloudsBackground | null = null;

export function render() {

	if (config.DISABLE_ASSETS) return null;

	backgroundInstance = new CloudsBackground.CloudsBackground({
		preset: "nebula",
	});

	return backgroundInstance;
}

export function getCloudsBg() {
	return backgroundInstance;
}
