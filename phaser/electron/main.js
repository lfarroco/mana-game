const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

// Try to initialize Steam - only works if steamworks.js is installed
// IMPORTANT: Must be initialized BEFORE app.whenReady() for overlay to work
let steamworks = null;
try {
	// Only require steamworks.js in Electron builds (not browser)
	steamworks = require('steamworks.js');
	console.log('[Electron] Steam API initialized successfully');
} catch (error) {
	console.log('[Electron] Steam API not available (this is normal for non-Steam builds)', error);
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
			preload: path.join(__dirname, 'preload.js')
		},
		icon: path.join(__dirname, 'icon.png')
	});

	if (process.env.NODE_ENV === 'development') {
		mainWindow.loadURL('http://localhost:8080');
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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