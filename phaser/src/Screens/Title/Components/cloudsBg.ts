import * as CloudsBackground from "@Components/CloudsBackground/CloudsBackground";
import * as config from "@config";

let backgroundInstance: CloudsBackground.CloudsBackground | null = null;

export function create() {
	if (config.DISABLE_ASSETS) return null;

	backgroundInstance = new CloudsBackground.CloudsBackground({
		preset: "nebula",
	});

	return backgroundInstance;
}

export function getCloudsBg() {
	return backgroundInstance;
}

/**
 * Destroy the cached background. Called on scene shutdown: Phaser destroys the
 * underlying game objects, but the module-level cache (and the shared
 * `activeInstance` in CloudsBackground) would otherwise keep pointing at a
 * dead instance across screens.
 */
export function destroy() {
	backgroundInstance?.destroy();
	backgroundInstance = null;
}
