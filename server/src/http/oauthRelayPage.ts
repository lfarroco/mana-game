/**
 * OAuth relay page — served at GET /oauth/callback (docs/itchio-auth.md,
 * docs/android-multiplayer.md).
 *
 * Both the itch.io and Google authorize URLs redirect here with the OAuth
 * credential in the URL **hash** (`#access_token=…` / `#id_token=…`). The page
 * forwards that hash back to the game:
 *
 *   1. **Popup / web**: `postMessage` the hash to the opener (cross-origin)
 *      and close. The hash never leaves the browser.
 *   2. **No opener + game URL in state** (web popup-blocked fallback): the
 *      client encodes `<nonce>|<gameUrl>` into the OAuth `state`; the page
 *      redirects the browser back to that game URL with the hash appended —
 *      but ONLY for allowlisted hosts (never an open redirect).
 *   3. **No opener, no game URL** (Android): `location.replace(
 *      "com.manabattle.app://oauth#" + hash)` — a JS-initiated custom-scheme
 *      navigation, which preserves the fragment (a browser→app https intent
 *      would drop it). The manifest intent filter delivers the URI back to
 *      the app, where @capacitor/app's `appUrlOpen` surfaces it
 *      (phaser/src/lib/oauthAndroid.ts).
 *
 * The page is static and dependency-free. The token/hash never touches any
 * server-side log: it is only ever read by this page's own script.
 */

export const OAUTH_RELAY_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Mana Battle — sign-in</title>
<style>
  body { background: #0d0d18; color: #e8e8f0; font-family: sans-serif; display: flex;
         align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { text-align: center; }
  .card h1 { font-size: 20px; font-weight: 600; }
  .card p { color: #9a9ab0; font-size: 14px; }
</style>
</head>
<body>
<div class="card">
  <h1>Signing you in…</h1>
  <p>You can close this window once Mana Battle reopens.</p>
</div>
<script>
(function () {
  var rawHash = window.location.hash || "";
  var payload = rawHash.charAt(0) === "#" ? rawHash.slice(1) : rawHash;

  if (window.opener) {
    // Web/popup: hand the hash to the opener (cross-origin postMessage) and
    // close this window. The credential never leaves the browser.
    try {
      window.opener.postMessage(
        { type: "mana-oauth-return", payload: payload },
        "*"
      );
    } catch (e) {
      // no-op — some browsers restrict postMessage targets; the flows below
      // are the fallbacks.
    }
    window.close();
    return;
  }

  // No opener. Two cases:
  //  - Web popup-blocked fallback: the client put "<nonce>|<gameUrl>" in the
  //    OAuth state; send the browser back to that page with the hash.
  //  - Android: forward the hash to the app via the custom-scheme deep link
  //    (JS-initiated custom-scheme navigation keeps the #fragment intact).
  var state = "";
  try { state = new URLSearchParams(payload).get("state") || ""; } catch (e) {}
  var pipe = state.indexOf("|");
  var gameUrl = pipe >= 0 ? state.slice(pipe + 1) : "";
  if (gameUrl !== "" && isAllowedGameUrl(gameUrl)) {
    window.location.replace(gameUrl + rawHash);
    return;
  }
  window.location.replace("com.manabattle.app://oauth" + rawHash);
}());

// Open-redirect guard: only bounce back to hosts we or itch.io control.
function isAllowedGameUrl(url) {
  try {
    var host = new URL(url).host.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "lfarroco.itch.io") return true;
    if (host.slice(-".itch.zone".length) === ".itch.zone") return true;
    return false;
  } catch (e) {
    return false;
  }
}
</script>
</body>
</html>
`;
