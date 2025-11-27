const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

// Try to initialize Steam - only works if steamworks.js is installed
let steamworks = null;
try {
	// Only require steamworks.js in Electron builds (not browser)
	steamworks = require('steamworks.js');
	console.log('[Electron] Steam API initialized successfully');
} catch (error) {
	console.log('[Electron] Steam API not available (this is normal for non-Steam builds)');
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


	// Load the app
	if (process.env.NODE_ENV === 'development') {
		mainWindow.loadURL('http://localhost:8080');
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
	}
}

app.whenReady().then(() => {
	createWindow();

	// Register Shift+Tab to activate Steam overlay
	// Note: Steam overlay is automatically handled by Steam when the game runs through Steam
	// This just ensures Electron doesn't block the shortcut
	if (steamworks) {
		globalShortcut.register('Shift+Tab', () => {
			try {
				// Activate Steam overlay
				steamworks.overlay.activateToWebPage('');
				console.log('[Electron] Steam overlay activated via Shift+Tab');
			} catch (error) {
				console.log('[Electron] Could not activate Steam overlay:', error);
			}
		});
		console.log('[Electron] Shift+Tab shortcut registered for Steam overlay');
	}
});

app.on('window-all-closed', () => {
	// Unregister all shortcuts before quitting
	globalShortcut.unregisterAll();

	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});