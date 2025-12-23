import { CloudsBackground } from "../../../Components/cloudBackground/CloudsBackground";

let backgroundInstance: CloudsBackground | null = null;

export function cloudsBg() {
	backgroundInstance = new CloudsBackground({
		preset: "nebula",
	});
}

export function getCloudsBg() {
	return backgroundInstance;
}
