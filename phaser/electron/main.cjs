const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const { requireSteamworks } = require('./steamworks.cjs');

// Try to initialize Steam - only works if steamworks.js is installed
// IMPORTANT: Must be initialized BEFORE app.whenReady() for overlay to work
let steamworks = null;
try {
	// Only require steamworks.js in Electron builds (not browser)
	steamworks = requireSteamworks();
	console.log('[Electron] Steam API initialized successfully');
} catch (error) {
	console.log('[Electron] Steam API not available (is the Steam client running? this is normal for non-Steam builds)', error);
}

// Initialize Steam client and enable overlay BEFORE app.whenReady()
// This is critical for Shift+Tab overlay to work properly
if (steamworks) {
	try {
		steamworks.electronEnableSteamOverlay();
		console.log('[Electron] Steam overlay enabled - Shift+Tab should work');
	} catch (error) {
		console.log('[Electron] Could not enable Steam overlay:', error);
	}
}

function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			// Required for steamworks.js to work
			nodeIntegration: true,
			contextIsolation: false,
			preload: path.join(__dirname, 'preload.cjs')
		},
		icon: path.join(__dirname, 'icon.png')
	});

	if (process.env.NODE_ENV === 'development') {
		if (process.env.MANA_LOAD_DIST === '1') {
			// Load the built dist bundle instead of the webpack dev server —
			// used by `make electron-dev-droplet`, which bakes the droplet
			// MANA_SERVER_URL into the dist build and needs no local
			// webpack-dev-server. DevTools still open for the dev loop.
			mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
		} else {
			mainWindow.loadURL('http://localhost:8080');
		}
		mainWindow.webContents.openDevTools();
	} else {
		// dist/index.html lives one level up in both layouts:
		//   dev run:      <repo>/phaser/dist     (this file is <repo>/phaser/electron/main.cjs)
		//   packaged app: <app.asar>/dist        (this file is <app.asar>/electron/main.cjs)
		mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
	}
}

app.whenReady().then(() => {
	createWindow();
});

app.on('window-all-closed', () => {
	// Unregister all shortcuts before quitting
	globalShortcut.unregisterAll();

	app.quit();
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});