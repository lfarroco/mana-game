/**
 * Token service — opaque bearer tokens for API auth.
 *
 * Scheme (docs/auth.md): 32 random bytes base64url'd as the plaintext; only the
 * SHA-256 hex hash is ever persisted (TokenRepo). The plaintext is returned to
 * the client exactly once at issue time.
 */

import { createHash, randomBytes } from "node:crypto";
import type { TokenRecord, TokenRepo } from "../persistence/repositories";

/** Default bearer-token lifetime in days (MANA_TOKEN_TTL_DAYS). */
export const DEFAULT_TOKEN_TTL_DAYS = 30;

export type TokenService = {
  /** Fresh opaque token: `crypto.randomBytes(32).toString("base64url")`. */
  generateToken(): string;
  /** SHA-256 hex digest of a token — the only form that is stored. */
  hashToken(token: string): string;
  /**
   * Persist the hash of a fresh token and return the plaintext exactly once.
   * `ttlDays` defaults to the service-configured lifetime.
   */
  issueToken(playerId: string, ttlDays?: number): string;
};

export function createTokenService(
  repo: TokenRepo,
  ttlDays: number = DEFAULT_TOKEN_TTL_DAYS,
): TokenService {
  const generateToken = (): string => randomBytes(32).toString("base64url");
  const hashToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

  return {
    generateToken,
    hashToken,
    issueToken(playerId, ttl = ttlDays) {
      const token = generateToken();
      const now = Date.now();

      const record: TokenRecord = {
        tokenHash: hashToken(token),
        playerId,
        expiresAt: now + ttl * 24 * 60 * 60 * 1000,
        createdAt: now,
      };
      repo.create(record);

      return token;
    },
  };
}
