export function isElectron(): boolean {
	const userAgent = navigator.userAgent.toLowerCase();
	return userAgent.indexOf(" electron/") > -1;
}

/**
 * True inside a Capacitor native shell (Android/iOS). Capacitor injects
 * `window.Capacitor` into the WebView at runtime — absent in plain browsers
 * and Electron.
 *
 * Used to route multiplayer login: on Android the itch.io/Google OAuth flows
 * must run through the system browser + custom-scheme deep link
 * (src/lib/oauthAndroid.ts), because `window.open` popups cannot work inside
 * the WebView (docs/android-multiplayer.md).
 */
export function isCapacitor(): boolean {
	if (typeof window === "undefined") return false;
	return Boolean((window as unknown as { Capacitor?: unknown }).Capacitor);
}
