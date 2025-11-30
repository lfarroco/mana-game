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

// Expose function to open external URLs (works in Electron)
try {
	const { shell } = require('electron');
	window.openExternalURL = (url) => {
		console.log('[Preload] Opening external URL:', url);
		shell.openExternal(url);
	};
	console.log('[Preload] External URL opener exposed to window');
} catch (error) {
	console.log('[Preload] Not in Electron context - external URLs will use window.open', error);
}
