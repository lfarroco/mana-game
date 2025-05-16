const { app, BrowserWindow } = require('electron');

function createWindow() {
	const mainWindow = new BrowserWindow(/* your options */);
	mainWindow.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);