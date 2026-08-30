/**
 * HTTP tests for the OAuth relay page (GET /oauth/callback,
 * docs/android-multiplayer.md).
 */
/// <reference types="jest" />

import request from "supertest";
import { createApp } from "../src/app";
import { OAUTH_RELAY_PAGE } from "../src/http/oauthRelayPage";

describe("GET /oauth/callback", () => {
  it("serves the relay page (html) without auth", async () => {
    const app = createApp();

    const res = await request(app).get("/oauth/callback");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toBe(OAUTH_RELAY_PAGE);
  });

  it("forwards the hash to the Android custom scheme", () => {
    // The Android path navigates to the app's deep link with the hash intact.
    expect(OAUTH_RELAY_PAGE).toContain(
      'window.location.replace("com.manabattle.app://oauth" + rawHash)',
    );
  });

  it("posts the hash to the opener for web/popup flows", () => {
    expect(OAUTH_RELAY_PAGE).toContain('type: "mana-oauth-return"');
  });

  it("bounces web popup-blocked returns back to the game URL (allowlisted only)", () => {
    // The client encodes "<nonce>|<gameUrl>" into the OAuth state; the relay
    // redirects there with the hash — guarded against open redirects.
    expect(OAUTH_RELAY_PAGE).toContain('state.indexOf("|")');
    expect(OAUTH_RELAY_PAGE).toContain("window.location.replace(gameUrl + rawHash)");
    expect(OAUTH_RELAY_PAGE).toContain('host.slice(-".itch.zone".length) === ".itch.zone"');
  });
});
