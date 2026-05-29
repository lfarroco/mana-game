import * as CloudsBackground from "@Components/cloudBackground/CloudsBackground";

let backgroundInstance: CloudsBackground.CloudsBackground | null = null;

export function render() {
	backgroundInstance = new CloudsBackground.CloudsBackground({
		preset: "nebula",
	});

	return backgroundInstance;
}

export function getCloudsBg() {
	return backgroundInstance;
}
