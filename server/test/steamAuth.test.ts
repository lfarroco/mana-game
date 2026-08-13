/**
 * Unit tests for the Steam Web API client (plan.md item 4).
 *
 * `fetch` is injected so the Steam Web API is fully mocked — no Steam client
 * or publisher key is required.
 */
/// <reference types="jest" />

import {
  createSteamAuthClient,
  STEAM_AUTHENTICATE_URL,
  STEAM_IDENTITY,
  type SteamAuthClient,
} from "../src/services/steamAuth";

const KEY = "publisher-key";
const APP_IDS = [3757600, 4233280];
const STEAM_ID = "76561198000000000"; // valid 17-digit steamid64
const TICKET = "deadbeef";

type FetchHandlerOptions = {
  ok?: boolean;
  status?: number;
  body?: unknown;
  nonJson?: boolean;
  networkError?: boolean;
};

type FetchImpl = typeof globalThis.fetch;

/** Fake fetch recording every URL; optionally forces an error shape. */
function makeFetch(options: FetchHandlerOptions = {}): {
  fetch: FetchImpl;
  calls: string[];
} {
  const calls: string[] = [];
  const fetch: FetchImpl = (async (url: string) => {
    calls.push(url);
    if (options.networkError) throw new Error("ECONNREFUSED");
    if (options.nonJson) {
      return {
        ok: options.ok ?? true,
        status: options.status ?? 200,
        json: () => {
          throw new Error("Unexpected token < in JSON");
        },
      } as unknown as Response;
    }
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      json: async () =>
        options.body ?? {
          response: { params: { result: "OK", steamid: STEAM_ID } },
        },
    } as unknown as Response;
  }) as FetchImpl;
  return { fetch, calls };
}

function makeClient(fetch: FetchImpl): SteamAuthClient {
  return createSteamAuthClient({ webApiKey: KEY, appIds: APP_IDS, fetch });
}

describe("createSteamAuthClient", () => {
  it("fails fast when the publisher key is missing", () => {
    expect(() =>
      createSteamAuthClient({ webApiKey: "", appIds: APP_IDS }),
    ).toThrow(/MANA_STEAM_WEB_API_KEY/);
  });

  describe("validateTicket", () => {
    it("returns the steamid64 for a valid ticket", async () => {
      const { fetch, calls } = makeFetch();
      const client = makeClient(fetch);

      const result = await client.validateTicket({
        ticket: TICKET,
        identity: STEAM_IDENTITY,
        appId: 3757600,
      });

      expect(result).toEqual({ steamId: STEAM_ID });
      expect(calls).toHaveLength(1);

      // The request hits the partner endpoint with key/appid/ticket/identity.
      const url = new URL(calls[0]);
      expect(url.origin + url.pathname).toBe(STEAM_AUTHENTICATE_URL);
      expect(url.searchParams.get("key")).toBe(KEY);
      expect(url.searchParams.get("appid")).toBe("3757600");
      expect(url.searchParams.get("ticket")).toBe(TICKET);
      expect(url.searchParams.get("identity")).toBe(STEAM_IDENTITY);
    });

    it("rejects a mismatched identity without calling the Web API", async () => {
      const { fetch, calls } = makeFetch();
      const client = makeClient(fetch);

      await expect(
        client.validateTicket({
          ticket: TICKET,
          identity: "some-other-server",
          appId: 3757600,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_identity" }),
      );
      expect(calls).toHaveLength(0);
    });

    it("rejects an appId outside the allowlist without calling the Web API", async () => {
      const { fetch, calls } = makeFetch();
      const client = makeClient(fetch);

      await expect(
        client.validateTicket({
          ticket: TICKET,
          identity: STEAM_IDENTITY,
          appId: 9999999,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_steam_ticket" }),
      );
      expect(calls).toHaveLength(0);
    });

    it("rejects a non-200 response (Steam rejecting the ticket)", async () => {
      const client = makeClient(makeFetch({ ok: false, status: 401 }).fetch);

      await expect(
        client.validateTicket({
          ticket: TICKET,
          identity: STEAM_IDENTITY,
          appId: 3757600,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_steam_ticket" }),
      );
    });

    it("rejects a non-17-digit steamid", async () => {
      const client = makeClient(
        makeFetch({
          body: { response: { params: { result: "OK", steamid: "123" } } },
        }).fetch,
      );

      await expect(
        client.validateTicket({
          ticket: TICKET,
          identity: STEAM_IDENTITY,
          appId: 3757600,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_steam_ticket" }),
      );
    });

    it("rejects a response without params", async () => {
      const client = makeClient(
        makeFetch({ body: { response: { error: { code: 401 } } } }).fetch,
      );

      await expect(
        client.validateTicket({
          ticket: TICKET,
          identity: STEAM_IDENTITY,
          appId: 3757600,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_steam_ticket" }),
      );
    });

    it("rejects a non-JSON response body", async () => {
      const client = makeClient(makeFetch({ nonJson: true }).fetch);

      await expect(
        client.validateTicket({
          ticket: TICKET,
          identity: STEAM_IDENTITY,
          appId: 3757600,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_steam_ticket" }),
      );
    });

    it("surfaces upstream network failures as 502", async () => {
      const client = makeClient(makeFetch({ networkError: true }).fetch);

      await expect(
        client.validateTicket({
          ticket: TICKET,
          identity: STEAM_IDENTITY,
          appId: 3757600,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ status: 502, code: "internal_error" }),
      );
    });
  });

  describe("authenticator", () => {
    it("validates a credential and returns the provider identity", async () => {
      const client = makeClient(makeFetch().fetch);

      const identity = await client.authenticator.authenticate({
        ticket: TICKET,
        identity: STEAM_IDENTITY,
        appId: 3757600,
        displayName: "Momo",
      });

      expect(identity).toEqual({ providerId: STEAM_ID, displayName: "Momo" });
    });

    it("passes through no displayName when omitted", async () => {
      const client = makeClient(makeFetch().fetch);

      const identity = await client.authenticator.authenticate({
        ticket: TICKET,
        identity: STEAM_IDENTITY,
        appId: 3757600,
      });

      expect(identity).toEqual({
        providerId: STEAM_ID,
        displayName: undefined,
      });
    });

    it("rejects malformed credentials", async () => {
      const client = makeClient(makeFetch().fetch);

      for (const bad of [
        {},
        { ticket: 42, identity: STEAM_IDENTITY, appId: 3757600 },
        { ticket: TICKET, identity: "", appId: 3757600 },
        { ticket: TICKET, identity: STEAM_IDENTITY, appId: "3757600" },
      ]) {
        await expect(client.authenticator.authenticate(bad)).rejects.toThrow(
          expect.objectContaining({
            status: 401,
            code: "invalid_steam_ticket",
          }),
        );
      }
    });
  });
});
