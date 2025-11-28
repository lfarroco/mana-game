// Preload script to expose Steam API to renderer process
// This runs before the renderer process code

try {
	const steamworks = require('steamworks.js');
	const client = steamworks.init();
	window.steamworks = client;
	console.log('[Preload] Steam client initialized and exposed to window');
} catch (error) {
	console.log('[Preload] Steam API not available - this is normal for non-Steam builds', error);
}
