/**
 * Android (Capacitor) OAuth transport — docs/android-multiplayer.md.
 *
 * `window.open` popups cannot work inside the Capacitor WebView, so on
 * Android the itch.io / Google login flows run like this:
 *
 *   1. The app opens the provider's authorize URL in the system browser
 *      (Chrome Custom Tab via @capacitor/browser). The redirect_uri is the
 *      game server's OAuth relay page (`<server>/oauth/callback`).
 *   2. The provider redirects the browser there with the credential in the
 *      URL hash (`#access_token=…` / `#id_token=…`).
 *   3. The relay page does `location.replace("com.manabattle.app://oauth#" +
 *      <hash>)` — a JS-initiated custom-scheme navigation, which preserves
 *      the hash fragment (a browser→app https intent would drop it).
 *   4. Android delivers the URI back to the app via the manifest intent
 *      filter; @capacitor/app's `appUrlOpen` event surfaces it here.
 *
 * The Capacitor plugins are imported lazily (dynamic import) so the web
 * bundle and jest never load them; every function is injectable for tests.
 */

import { isCapacitor } from "@Utils/environment";

/** Custom scheme + host of the app's OAuth deep link (AndroidManifest). */
export const DEEP_LINK_SCHEME = "com.manabattle.app";
export const DEEP_LINK_HOST = "oauth";

/**
 * The OAuth relay page — served by the game server at `<server>/oauth/callback`.
 * Both the itch.io and Google authorize URLs redirect here (it must be
 * registered as a redirect URI in the itch.io OAuth app and the Google Cloud
 * OAuth client); the page forwards the hash back to the app via the custom
 * scheme (docs/android-multiplayer.md).
 */
export function readOAuthRelayUri(serverUrl: string): string {
	return `${serverUrl}/oauth/callback`;
}

/** Parse a deep-link return URL into a credential + state (or null). */
export function parseOAuthReturnUrl(url: string): { credential: string; state?: string } | null {
	const hashIndex = url.indexOf("#");
	if (hashIndex < 0) return null;
	const params = new URLSearchParams(url.slice(hashIndex + 1));
	const credential = params.get("id_token") ?? params.get("access_token");
	if (!credential || credential === "") return null;
	return { credential, state: params.get("state") ?? undefined };
}

/** Module-level stash for a cold-start deep-link return (boot capture). */
let stashedLaunchReturn: { credential: string; state?: string } | null = null;

/**
 * Boot-time capture (main.ts): if the app was cold-started by an OAuth deep
 * link, @capacitor/app's launch URL holds the return. Stash it so the next
 * login consumes it. No-op on non-Capacitor platforms.
 */
export function captureLaunchReturnIfPresent(): void {
	if (!isCapacitor()) return;
	void (async () => {
		try {
			const { App } = await import("@capacitor/app");
			const launch = await App.getLaunchUrl();
			if (!launch?.url) return;
			const parsed = parseOAuthReturnUrl(launch.url);
			if (parsed) stashedLaunchReturn = parsed;
		} catch (err) {
			console.warn("[oauthAndroid] launch-URL capture failed", err);
		}
	})();
}

/** Consume a stashed cold-start return (or null). */
export function consumeLaunchReturn(): { credential: string; state?: string } | null {
	const value = stashedLaunchReturn;
	stashedLaunchReturn = null;
	return value;
}

/**
 * Implementation deps of the transport — injectable so tests never touch the
 * Capacitor plugins.
 */
export type OAuthAndroidImplDeps = {
	/** Open the authorize URL in the system browser (Custom Tab). */
	openExternal: (url: string) => Promise<void>;
	/**
	 * Wait for the deep-link return. Resolves with the credential when a URL
	 * with a matching `state` (or any, when state is undefined) arrives.
	 */
	waitForReturn: (opts: {
		state?: string;
		timeoutMs?: number;
	}) => Promise<{ credential: string; state?: string }>;
	/** Consume a cold-start launch-URL return, if any. */
	consumeLaunchReturn: () => { credential: string; state?: string } | null;
};

/**
 * The public transport surface used by the login clients: open the authorize
 * URL and resolve with the returned credential.
 */
export type OAuthAndroidDeps = {
	runOAuthAndroid: (url: string, opts?: { state?: string; timeoutMs?: number }) => Promise<string>;
};

async function defaultOpenExternal(url: string): Promise<void> {
	const { Browser } = await import("@capacitor/browser");
	await Browser.open({ url });
}

function defaultWaitForReturn(opts: {
	state?: string;
	timeoutMs?: number;
}): Promise<{ credential: string; state?: string }> {
	return new Promise((resolve, reject) => {
		const timeoutMs = opts.timeoutMs ?? 2 * 60 * 1000;
		let dispose: (() => void) | null = null;

		const finish = (parsed: { credential: string; state?: string }) => {
			dispose?.();
			resolve(parsed);
		};
		const fail = (message: string) => {
			dispose?.();
			reject(new Error(message));
		};

		const timer = setTimeout(() => fail("OAuth sign-in timed out"), timeoutMs);
		dispose = () => clearTimeout(timer);

		void (async () => {
			try {
				const { App } = await import("@capacitor/app");
				const listener = await App.addListener("appUrlOpen", (data: { url: string }) => {
					const parsed = parseOAuthReturnUrl(data.url);
					if (!parsed) return;
					if (
						opts.state !== undefined &&
						parsed.state !== undefined &&
						parsed.state !== opts.state
					) {
						return; // nonce mismatch — ignore
					}
					finish(parsed);
				});
				const prevDispose = dispose;
				dispose = () => {
					prevDispose?.();
					void listener.remove();
				};

				// The app may have been cold-started by the deep link while the
				// WebView was still booting — check the launch URL too.
				const launch = await App.getLaunchUrl();
				if (launch?.url) {
					const parsed = parseOAuthReturnUrl(launch.url);
					if (parsed) {
						if (
							opts.state !== undefined &&
							parsed.state !== undefined &&
							parsed.state !== opts.state
						) {
							return;
						}
						finish(parsed);
					}
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				fail(`OAuth deep-link setup failed: ${message}`);
			}
		})();
	});
}

/** Build a transport from (injectable) implementation deps. */
export function createOAuthAndroid(deps: Partial<OAuthAndroidImplDeps> = {}): OAuthAndroidDeps {
	const impl: OAuthAndroidImplDeps = {
		openExternal: deps.openExternal ?? defaultOpenExternal,
		waitForReturn: deps.waitForReturn ?? defaultWaitForReturn,
		consumeLaunchReturn: deps.consumeLaunchReturn ?? consumeLaunchReturn,
	};

	return {
		async runOAuthAndroid(url, opts = {}) {
			const stashed = impl.consumeLaunchReturn();
			if (stashed) return stashed.credential;
			await impl.openExternal(url);
			const result = await impl.waitForReturn(opts);
			return result.credential;
		},
	};
}

/** Default transport wired to the Capacitor plugins (lazily imported). */
export const oauthAndroid: OAuthAndroidDeps = createOAuthAndroid();
