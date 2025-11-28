// Preload script to expose Steam API to renderer process
// This runs before the renderer process code

try {
	const greenworks = require('greenworks');

	// Activate UV loop for greenworks in renderer process
	// See: https://github.com/greenheartgames/greenworks/issues/61
	if (process.activateUvLoop) {
		process.activateUvLoop();
	}

	// We don't need to init here again if main process did it, but we expose the library
	// Note: greenworks functions are mostly synchronous
	window.greenworks = greenworks;
	console.log('[Preload] Steam API (greenworks) successfully exposed to window');
} catch (error) {
	console.log('[Preload] Steam API not available - this is normal for non-Steam builds');
	// Don't expose greenworks if it's not available
}

