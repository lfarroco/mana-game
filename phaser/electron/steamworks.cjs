// Resolve the steamworks.js native module for both dev and packaged runs.
//
// - Packaged build: electron-builder bundles steamworks.js at the app root
//   (phaser/package.json "build.files" includes node_modules/steamworks.js),
//   so `require('steamworks.js')` resolves normally.
// - Dev run (`make electron`, `make electron-dev`): this file lives in
//   phaser/electron/, and steamworks.js is installed under phaser/node_modules
//   — one level up. Fall back to that copy so the dev build gets the same
//   module (Steam overlay, auth tickets, persona name, …).
'use strict';

const path = require('path');

function requireSteamworks() {
	try {
		return require('steamworks.js'); // packaged build (bundled at app root)
	} catch {
		// Dev run: phaser/node_modules is one level above phaser/electron.
		return require(path.join(__dirname, '..', 'node_modules', 'steamworks.js'));
	}
}

module.exports = { requireSteamworks };
