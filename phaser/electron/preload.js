// Preload script to expose Steam API to renderer process
// This runs before the renderer process code

try {
	const steamworks = require('steamworks.js');
	window.steamworks = steamworks;
	console.log('[Preload] Steam API successfully exposed to window');
} catch (error) {
	console.log('[Preload] Steam API not available - this is normal for non-Steam builds');
	// Don't expose steamworks if it's not available
}

