/**
 * Unit tests for the itch.io API client (docs/itchio-auth.md Phase A).
 *
 * `fetch` is injected so api.itch.io is fully mocked — no itch.io account or
 * developer key is required.
 */
/// <reference types="jest" />

import {
  createItchAuthClient,
  ITCH_PROFILE_URL,
  type ItchAuthClient,
} from "../src/services/itchAuth";

const USER_ID = 1994;
const USERNAME = "Momo";
const TOKEN = "valid-itch-token";

type FetchHandlerOptions = {
  ok?: boolean;
  status?: number;
  body?: unknown;
  nonJson?: boolean;
  networkError?: boolean;
  /** Plain-text body returned by `text()` (non-200 error diagnostics). */
  bodyText?: string;
};

type FetchImpl = typeof globalThis.fetch;

/** Fake fetch recording every call; optionally forces an error shape. */
function makeFetch(options: FetchHandlerOptions = {}): {
  fetch: FetchImpl;
  calls: { url: string; init?: { headers?: Record<string, string> } }[];
} {
  const calls: { url: string; init?: { headers?: Record<string, string> } }[] =
    [];
  const fetch: FetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init: init as { headers?: Record<string, string> } });
    if (options.networkError) throw new Error("ECONNREFUSED");
    if (options.nonJson) {
      return {
        ok: options.ok ?? true,
        status: options.status ?? 200,
        text: async () => options.bodyText ?? "",
        json: () => {
          throw new Error("Unexpected token < in JSON");
        },
      } as unknown as Response;
    }
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      text: async () => options.bodyText ?? "",
      json: async () =>
        options.body ?? { user: { id: USER_ID, username: USERNAME } },
    } as unknown as Response;
  }) as FetchImpl;
  return { fetch, calls };
}

function makeClient(fetch: FetchImpl): ItchAuthClient {
  return createItchAuthClient({ fetch });
}

describe("createItchAuthClient", () => {
  describe("validateToken", () => {
    it("returns the itch user id and username for a valid token", async () => {
      const { fetch, calls } = makeFetch();
      const client = makeClient(fetch);

      const result = await client.validateToken(TOKEN);

      expect(result).toEqual({ userId: String(USER_ID), username: USERNAME });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(ITCH_PROFILE_URL);
      // The player's own token is the credential — sent only as the bearer.
      expect(calls[0].init?.headers?.Authorization).toBe(`Bearer ${TOKEN}`);
    });

    it("returns no username when the profile omits it", async () => {
      const client = makeClient(
        makeFetch({ body: { user: { id: USER_ID } } }).fetch,
      );

      const result = await client.validateToken(TOKEN);
      expect(result).toEqual({ userId: String(USER_ID), username: undefined });
    });

    it("rejects a non-2xx profile response as an invalid token", async () => {
      const client = makeClient(
        makeFetch({ ok: false, status: 401, bodyText: "invalid token" }).fetch,
      );

      await expect(client.validateToken(TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_itch_token" }),
      );
    });

    it("surfaces upstream network failures as 502", async () => {
      const client = makeClient(makeFetch({ networkError: true }).fetch);

      await expect(client.validateToken(TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 502, code: "internal_error" }),
      );
    });

    it("rejects a non-JSON response body", async () => {
      const client = makeClient(makeFetch({ nonJson: true }).fetch);

      await expect(client.validateToken(TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_itch_token" }),
      );
    });

    it("rejects a missing or non-numeric user id", async () => {
      for (const body of [
        {},
        { user: {} },
        { user: { id: "abc" } },
        { user: { id: 1.5 } },
        { user: { id: null } },
      ]) {
        const client = makeClient(makeFetch({ body }).fetch);
        await expect(client.validateToken(TOKEN)).rejects.toThrow(
          expect.objectContaining({ status: 401, code: "invalid_itch_token" }),
        );
      }
    });

    it("honors a custom profile URL", async () => {
      const { fetch, calls } = makeFetch();
      const client = createItchAuthClient({
        fetch,
        url: "https://profile.test.local",
      });

      await client.validateToken(TOKEN);
      expect(calls[0].url).toBe("https://profile.test.local");
    });
  });

  describe("authenticator", () => {
    it("validates a credential and returns the provider identity", async () => {
      const client = makeClient(makeFetch().fetch);

      const identity = await client.authenticator.authenticate({
        token: TOKEN,
      });

      expect(identity).toEqual({
        providerId: String(USER_ID),
        displayName: USERNAME,
      });
    });

    it("rejects malformed credentials", async () => {
      const client = makeClient(makeFetch().fetch);

      for (const bad of [{}, { token: 42 }, { token: "" }, { token: "   " }]) {
        await expect(client.authenticator.authenticate(bad)).rejects.toThrow(
          expect.objectContaining({ status: 401, code: "invalid_itch_token" }),
        );
      }
    });
  });
});
