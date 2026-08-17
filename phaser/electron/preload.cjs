// Preload script to expose Steam API to renderer process
// This runs before the renderer process code

const { requireSteamworks } = require('./steamworks.cjs');

try {
	const steamworks = requireSteamworks();
	const client = steamworks.init();
	window.steamworks = client;
	console.log('[Preload] Steam client initialized and exposed to window');
} catch (error) {
	console.log('[Preload] Steam API not available (is the Steam client running? this is normal for non-Steam builds)', error);
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

// Expose the Steam auth ticket helper for the client login flow (docs/auth.md,
// plan.md task 11). Returns the ticket as a hex string (what the server's
// AuthenticateUserTicket expects), or null when Steam is unavailable so the
// renderer can fall back to single-player.
try {
	window.auth = {
		// identity: the shared identity string ("mana-game-v1") that must match
		// the server's STEAM_IDENTITY (server/src/services/steamAuth.ts).
		// timeoutMs: optional; converted to the steamworks timeoutSeconds.
		getSteamAuthTicket: async (identity, timeoutMs) => {
			if (!window.steamworks || typeof window.steamworks.auth?.getAuthTicketForWebApi !== 'function') {
				console.log('[Preload] Steam auth not available - this is normal for non-Steam builds');
				return null;
			}
			const timeoutSeconds = timeoutMs ? Math.ceil(timeoutMs / 1000) : undefined;
			const ticket = await window.steamworks.auth.getAuthTicketForWebApi(identity, timeoutSeconds);
			if (!ticket) {
				console.log('[Preload] Steam auth ticket request returned no ticket');
				return null;
			}
			return ticket.getBytes().toString('hex');
		},
	};
	console.log('[Preload] Steam auth ticket helper exposed to window');
} catch (error) {
	console.log('[Preload] Steam auth not available - this is normal for non-Steam builds', error);
}
