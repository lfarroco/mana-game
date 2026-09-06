/**
 * HTTP integration tests for guest accounts: `POST /api/v1/auth/guest`
 * (credential-less login with a generated `AdjectiveNounNN` handle) and
 * `POST /api/v1/players/me/convert` (guest → itch/google linking).
 *
 * Provider APIs are mocked via createApp's injectable `itchFetch` /
 * `googleFetch` — the full convert path (DTO → credential validation →
 * provider re-point → token continuity) runs without real OAuth.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import {
  createMemoryPlayerRepo,
  createMemoryTokenRepo,
} from "../src/persistence/memory";
import type { PlayerRepo, TokenRepo } from "../src/persistence/repositories";
import {
  GUEST_ADJECTIVES,
  GUEST_NOUNS,
  generateGuestName,
} from "../src/services/guestNames";

const ITCH_USER_ID = 4242;
const GOOGLE_SUB = "google-sub-1";
const GOOGLE_CLIENT_ID = "test-google-client-id";

type FetchImpl = typeof globalThis.fetch;

/** Fake fetch standing in for api.itch.io/profile. */
function createItchFetchMock(userId: number = ITCH_USER_ID): FetchImpl {
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => ({ user: { id: userId, username: "itchuser" } }),
  })) as unknown as FetchImpl;
}

/** Fake fetch standing in for Google's tokeninfo endpoint. */
function createGoogleFetchMock(sub: string = GOOGLE_SUB): FetchImpl {
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      iss: "https://accounts.google.com",
      aud: GOOGLE_CLIENT_ID,
      sub,
      name: "Google User",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  })) as unknown as FetchImpl;
}

let playerRepo: PlayerRepo;
let tokenRepo: TokenRepo;

beforeEach(() => {
  playerRepo = createMemoryPlayerRepo();
  tokenRepo = createMemoryTokenRepo();
});

function createTestApp(overrides: Record<string, unknown> = {}): Express {
  return createApp({
    playerRepo,
    tokenRepo,
    itch: true,
    google: { clientId: GOOGLE_CLIENT_ID },
    itchFetch: createItchFetchMock(),
    googleFetch: createGoogleFetchMock(),
    ...overrides,
  });
}

async function loginAsGuest(
  app: Express,
  body: Record<string, unknown> = {},
): Promise<{ token: string; playerId: string; displayName: string }> {
  const res = await request(app).post("/api/v1/auth/guest").send(body);
  expect(res.status).toBe(200);
  return {
    token: res.body.token as string,
    playerId: res.body.player.playerId as string,
    displayName: res.body.player.displayName as string,
  };
}

describe("generateGuestName", () => {
  it("builds AdjectiveNounNN with a zero-padded number", () => {
    const name = generateGuestName({ nextInt: () => 0 });
    expect(name).toBe(`${GUEST_ADJECTIVES[0]}${GUEST_NOUNS[0]}00`);
  });

  it("uses the full 00-99 range", () => {
    const name = generateGuestName({ nextInt: (max) => max - 1 });
    expect(name.endsWith("99")).toBe(true);
  });

  it("always fits the display-name limit", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateGuestName().length).toBeLessThanOrEqual(24);
    }
  });
});

describe("POST /api/v1/auth/guest", () => {
  it("mints a guest player with a generated handle and a working token", async () => {
    const app = createTestApp();
    const { token, playerId, displayName } = await loginAsGuest(app);

    expect(playerId).not.toBe("");
    expect(displayName).toMatch(/^[A-Z][A-Za-z]*[0-9]{2}$/);

    const profile = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.player.provider).toBe("guest");
    expect(profile.body.player.displayName).toBe(displayName);
  });

  it("mints a fresh player on every call (no credential to reuse)", async () => {
    const app = createTestApp();
    const first = await loginAsGuest(app);
    const second = await loginAsGuest(app);
    expect(second.playerId).not.toBe(first.playerId);
  });

  it("accepts a supplied display name", async () => {
    const app = createTestApp();
    const { displayName } = await loginAsGuest(app, { displayName: "Momo" });
    expect(displayName).toBe("Momo");
  });

  it("rejects an invalid supplied display name", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/api/v1/auth/guest")
      .send({ displayName: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_display_name");
  });

  it("is available without any provider configured", async () => {
    const bare = createApp({ playerRepo, tokenRepo });
    const res = await request(bare).post("/api/v1/auth/guest").send({});
    expect(res.status).toBe(200);
    expect(res.body.player.provider).toBe("guest");
  });
});

describe("PATCH /api/v1/players/me as guest", () => {
  it("rejects renames — guests connect an account instead", async () => {
    const app = createTestApp();
    const { token } = await loginAsGuest(app);

    const res = await request(app)
      .patch("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "NewName" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("guest_cannot_rename");
  });
});

describe("POST /api/v1/players/me/convert", () => {
  it("converts a guest to itch, keeping the name and the token", async () => {
    const app = createTestApp();
    const { token, playerId, displayName } = await loginAsGuest(app);

    const res = await request(app)
      .post("/api/v1/players/me/convert")
      .set("Authorization", `Bearer ${token}`)
      .send({ provider: "itch", token: "itch-oauth-token" });

    expect(res.status).toBe(200);
    expect(res.body.player.playerId).toBe(playerId);
    expect(res.body.player.provider).toBe("itch");
    expect(res.body.player.providerId).toBe(String(ITCH_USER_ID));
    // The guest handle survives the conversion.
    expect(res.body.player.displayName).toBe(displayName);

    // The pre-convert Bearer [REDACTED] still works — identity is the player id.
    const profile = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.player.provider).toBe("itch");

    // The converted player can now rename (non-guest path).
    const rename = await request(app)
      .patch("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "LinkedName" });
    expect(rename.status).toBe(200);
    expect(rename.body.player.displayName).toBe("LinkedName");
  });

  it("converts a guest to google", async () => {
    const app = createTestApp();
    const { token, playerId } = await loginAsGuest(app);

    const res = await request(app)
      .post("/api/v1/players/me/convert")
      .set("Authorization", `Bearer ${token}`)
      .send({ provider: "google", idToken: "google-id-token" });

    expect(res.status).toBe(200);
    expect(res.body.player.playerId).toBe(playerId);
    expect(res.body.player.provider).toBe("google");
    expect(res.body.player.providerId).toBe(GOOGLE_SUB);
  });

  it("rejects linking an already-linked provider account", async () => {
    const app = createTestApp();
    // First player owns the itch account (regular login).
    const login = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: "itch-oauth-token" });
    expect(login.status).toBe(200);

    const { token } = await loginAsGuest(app);
    const res = await request(app)
      .post("/api/v1/players/me/convert")
      .set("Authorization", `Bearer ${token}`)
      .send({ provider: "itch", token: "itch-oauth-token" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("account_already_linked");
  });

  it("rejects converting a non-guest account", async () => {
    const app = createTestApp();
    const login = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: "itch-oauth-token" });
    const token = login.body.token as string;

    const res = await request(app)
      .post("/api/v1/players/me/convert")
      .set("Authorization", `Bearer ${token}`)
      .send({ provider: "google", idToken: "google-id-token" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("not_a_guest");
  });

  it("rejects a provider whose login is disabled", async () => {
    const app = createTestApp({ itch: false, google: undefined });
    const { token } = await loginAsGuest(app);

    const res = await request(app)
      .post("/api/v1/players/me/convert")
      .set("Authorization", `Bearer ${token}`)
      .send({ provider: "itch", token: "itch-oauth-token" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("provider_not_enabled");
  });

  it("rejects a mismatched credential field", async () => {
    const app = createTestApp();
    const { token } = await loginAsGuest(app);

    const res = await request(app)
      .post("/api/v1/players/me/convert")
      .set("Authorization", `Bearer ${token}`)
      .send({ provider: "google" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_google_token");
  });
});
