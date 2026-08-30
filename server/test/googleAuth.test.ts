/**
 * Unit tests for the Google auth client (docs/android-multiplayer.md).
 *
 * `fetch` is injected so Google's tokeninfo endpoint is fully mocked — no
 * Google account or client secret is required.
 */
/// <reference types="jest" />

import {
  createGoogleAuthClient,
  GOOGLE_TOKENINFO_URL,
  type GoogleAuthClient,
} from "../src/services/googleAuth";

const CLIENT_ID = "mana-battle-google-client.apps.googleusercontent.com";
const GOOGLE_ID = "112233445566778899000";
const NAME = "Momo Player";
const ID_TOKEN = "valid-google-id-token";

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
        options.body ?? {
          iss: "https://accounts.google.com",
          aud: CLIENT_ID,
          sub: GOOGLE_ID,
          name: NAME,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
    } as unknown as Response;
  }) as FetchImpl;
  return { fetch, calls };
}

function makeClient(fetch: FetchImpl): GoogleAuthClient {
  return createGoogleAuthClient({ clientId: CLIENT_ID, fetch });
}

describe("createGoogleAuthClient", () => {
  describe("validateIdToken", () => {
    it("returns the Google account id and verified name for a valid token", async () => {
      const { fetch, calls } = makeFetch();
      const client = makeClient(fetch);

      const result = await client.validateIdToken(ID_TOKEN);

      expect(result).toEqual({ googleId: GOOGLE_ID, name: NAME });
      expect(calls).toHaveLength(1);
      // The token travels as a query param on the tokeninfo GET (never logged).
      expect(calls[0]).toBe(
        `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(ID_TOKEN)}`,
      );
    });

    it("returns no name when the tokeninfo response omits it", async () => {
      const client = makeClient(
        makeFetch({ body: { iss: "accounts.google.com", aud: CLIENT_ID, sub: GOOGLE_ID } }).fetch,
      );

      const result = await client.validateIdToken(ID_TOKEN);
      expect(result).toEqual({ googleId: GOOGLE_ID, name: undefined });
    });

    it("rejects a token whose audience does not match the client id", async () => {
      const client = makeClient(
        makeFetch({
          body: {
            iss: "accounts.google.com",
            aud: "someone-elses-client.apps.googleusercontent.com",
            sub: GOOGLE_ID,
          },
        }).fetch,
      );

      await expect(client.validateIdToken(ID_TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_google_token" }),
      );
    });

    it("rejects tokens from an unexpected issuer", async () => {
      for (const iss of ["https://evil.example.com", "accounts.facebook.com"]) {
        const client = makeClient(
          makeFetch({ body: { iss, aud: CLIENT_ID, sub: GOOGLE_ID } }).fetch,
        );
        await expect(client.validateIdToken(ID_TOKEN)).rejects.toThrow(
          expect.objectContaining({
            status: 401,
            code: "invalid_google_token",
          }),
        );
      }
    });

    it("rejects a non-2xx tokeninfo response as an invalid token", async () => {
      const client = makeClient(
        makeFetch({ ok: false, status: 400, bodyText: "Invalid Value" }).fetch,
      );

      await expect(client.validateIdToken(ID_TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_google_token" }),
      );
    });

    it("surfaces upstream network failures as 502", async () => {
      const client = makeClient(makeFetch({ networkError: true }).fetch);

      await expect(client.validateIdToken(ID_TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 502, code: "internal_error" }),
      );
    });

    it("rejects a non-JSON response body", async () => {
      const client = makeClient(makeFetch({ nonJson: true }).fetch);

      await expect(client.validateIdToken(ID_TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_google_token" }),
      );
    });

    it("rejects a missing or non-string subject id", async () => {
      for (const body of [
        {},
        { iss: "accounts.google.com", aud: CLIENT_ID },
        { iss: "accounts.google.com", aud: CLIENT_ID, sub: 42 },
        { iss: "accounts.google.com", aud: CLIENT_ID, sub: "" },
      ]) {
        const client = makeClient(makeFetch({ body }).fetch);
        await expect(client.validateIdToken(ID_TOKEN)).rejects.toThrow(
          expect.objectContaining({ status: 401, code: "invalid_google_token" }),
        );
      }
    });

    it("rejects an expired token (defense in depth)", async () => {
      const client = makeClient(
        makeFetch({
          body: {
            iss: "accounts.google.com",
            aud: CLIENT_ID,
            sub: GOOGLE_ID,
            exp: Math.floor(Date.now() / 1000) - 60,
          },
        }).fetch,
      );

      await expect(client.validateIdToken(ID_TOKEN)).rejects.toThrow(
        expect.objectContaining({ status: 401, code: "invalid_google_token" }),
      );
    });

    it("honors a custom tokeninfo URL", async () => {
      const { fetch, calls } = makeFetch();
      const client = createGoogleAuthClient({
        clientId: CLIENT_ID,
        fetch,
        url: "https://tokeninfo.test.local",
      });

      await client.validateIdToken(ID_TOKEN);
      expect(calls[0]).toBe(
        `https://tokeninfo.test.local?id_token=${encodeURIComponent(ID_TOKEN)}`,
      );
    });
  });

  describe("authenticator", () => {
    it("validates a credential and returns the provider identity", async () => {
      const client = makeClient(makeFetch().fetch);

      const identity = await client.authenticator.authenticate({
        idToken: ID_TOKEN,
      });

      expect(identity).toEqual({ providerId: GOOGLE_ID, displayName: NAME });
    });

    it("rejects malformed credentials", async () => {
      const client = makeClient(makeFetch().fetch);

      for (const bad of [
        {},
        { idToken: 42 },
        { idToken: "" },
        { idToken: "   " },
      ]) {
        await expect(client.authenticator.authenticate(bad)).rejects.toThrow(
          expect.objectContaining({
            status: 401,
            code: "invalid_google_token",
          }),
        );
      }
    });
  });
});
