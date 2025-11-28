const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

// Try to initialize Steam - only works if greenworks is installed
// IMPORTANT: Must be initialized BEFORE app.whenReady() for overlay to work
let greenworks = null;
try {
	// Only require greenworks in Electron builds (not browser)
	greenworks = require('greenworks');

	if (greenworks.init()) {
		console.log('[Electron] Steam API initialized successfully');
		// Enable overlay
		// greenworks doesn't have a specific "enable overlay" function like steamworks.js
		// It usually works automatically if init() is successful and steam_appid.txt is present
		console.log('[Electron] Steam overlay should be active');
	} else {
		console.log('[Electron] Steam API initialization failed');
		greenworks = null;
	}
} catch (error) {
	console.log('[Electron] Steam API not available (this is normal for non-Steam builds)', error);
}

function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			// Required for greenworks to work
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