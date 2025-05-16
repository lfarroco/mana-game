const { app, BrowserWindow } = require('electron');

// continue from here https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app

function createWindow() {
	const mainWindow = new BrowserWindow(/* your options */);
	mainWindow.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);