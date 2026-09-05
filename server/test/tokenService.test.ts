/**
 * Unit tests for the token service (plan.md item 2).
 *
 * Covers the token scheme from docs/auth.md: opaque base64url plaintext,
 * only the SHA-256 hash persisted, TTL expiry, plaintext returned exactly once.
 */
/// <reference types="jest" />

import { createHash } from "node:crypto";
import { createMemoryTokenRepo } from "../src/persistence/memory";
import type { TokenRepo } from "../src/persistence/repositories";
import { createTokenService } from "../src/services/tokenService";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("tokenService", () => {
  let repo: TokenRepo;

  beforeEach(() => {
    repo = createMemoryTokenRepo();
  });

  describe("generateToken", () => {
    it("returns an opaque base64url string (32 bytes → 43 chars)", () => {
      const token = createTokenService(repo).generateToken();

      expect(typeof token).toBe("string");
      expect(token).toHaveLength(43);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("produces unique tokens", () => {
      const service = createTokenService(repo);

      const a = service.generateToken();
      const b = service.generateToken();

      expect(a).not.toBe(b);
    });
  });

  describe("hashToken", () => {
    it("returns a deterministic 64-char sha256 hex digest", () => {
      const service = createTokenService(repo);
      const digest = service.hashToken("my-token");

      expect(digest).toHaveLength(64);
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
      expect(digest).toBe(
        createHash("sha256").update("my-token").digest("hex"),
      );
      expect(service.hashToken("my-token")).toBe(digest);
    });
  });

  describe("issueToken", () => {
    it("persists only the hash — the plaintext is returned exactly once", async () => {
      const service = createTokenService(repo);

      const token = (await service.issueToken("player-1"));

      expect(typeof token).toBe("string");
      expect((await repo.findByHash(service.hashToken(token)))).not.toBeNull();
      // The plaintext token never touches the repo.
      expect((await repo.findByHash(token))).toBeNull();
    });

    it("defaults to the service-configured TTL", async () => {
      const service = createTokenService(repo, 7);

      const now = Date.now();
      const token = (await service.issueToken("player-1"));

      const record = (await repo.findByHash(service.hashToken(token)))!;
      expect(record.expiresAt).toBeGreaterThanOrEqual(now + 7 * DAY_MS);
      expect(record.expiresAt).toBeLessThan(now + 8 * DAY_MS);
    });

    it("honors an explicit ttlDays override", async () => {
      const service = createTokenService(repo, 30);

      const now = Date.now();
      const token = (await service.issueToken("player-1", 1));

      const record = (await repo.findByHash(service.hashToken(token)))!;
      expect(record.expiresAt).toBeGreaterThanOrEqual(now + DAY_MS);
      expect(record.expiresAt).toBeLessThan(now + 2 * DAY_MS);
    });

    it("allows multiple tokens for the same player", async () => {
      const service = createTokenService(repo);

      const a = (await service.issueToken("player-1"));
      const b = (await service.issueToken("player-1"));

      expect(a).not.toBe(b);
      expect((await repo.findByHash(service.hashToken(a)))!.playerId).toBe("player-1");
      expect((await repo.findByHash(service.hashToken(b)))!.playerId).toBe("player-1");
    });
  });
});
