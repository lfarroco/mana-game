/**
 * Auth service — the application layer for identity.
 *
 * Core model (docs/auth.md): *Steam proves identity once; the server owns
 * players and sessions.* Credential validation is provider-specific (one
 * `Authenticator` per provider); everything after it is provider-agnostic —
 * `findOrCreatePlayer` upserts the player, then `issueToken` mints a bearer
 * token. A future provider (Firebase/Supabase/guest) is a single new
 * `Authenticator` + route; sessions and matchmaking never know the provider.
 *
 * `steam` is the only enabled provider this phase.
 */

import { v4 as uuid } from "uuid";
import { ApiError } from "../errors";
import type {
  Player,
  PlayerProvider,
  PlayerRepo,
  TokenRepo,
} from "../persistence/repositories";
import { createTokenService } from "./tokenService";

/** Verified provider identity extracted from a credential. */
export type ProviderIdentity = {
  providerId: string;
  /** Steam persona; unverified client-supplied (docs/auth.md). */
  displayName?: string;
};

/**
 * Provider-specific credential validation. `steam` is the only registered
 * authenticator this phase; its `authenticate` calls the Steam Web API
 * (steamAuth service, task 4) and returns the verified steamid64.
 */
export type Authenticator = {
  provider: PlayerProvider;
  authenticate(credential: unknown): Promise<ProviderIdentity>;
};

export type LoginResult = {
  player: Player;
  token: string;
};

export type AuthService = {
  /** Upsert a player by (provider, providerId); repeat logins reuse the player. */
  findOrCreatePlayer(input: {
    provider: PlayerProvider;
    providerId: string;
    displayName?: string;
  }): Player;
  /**
   * Provider-agnostic login: validate via the provider's Authenticator, upsert
   * the player, and mint a bearer token. `credential` is provider-specific
   * (steam = `{ ticket, identity, appId }`).
   */
  login(provider: PlayerProvider, credential: unknown): Promise<LoginResult>;
};

export function createAuthService(deps: {
  playerRepo: PlayerRepo;
  tokenRepo: TokenRepo;
  tokenTtlDays?: number;
  authenticators?: Authenticator[];
}): AuthService {
  const tokenService = createTokenService(deps.tokenRepo, deps.tokenTtlDays);
  const authenticators = new Map<PlayerProvider, Authenticator>(
    (deps.authenticators ?? []).map((auth) => [auth.provider, auth]),
  );

  const findOrCreatePlayer = (input: {
    provider: PlayerProvider;
    providerId: string;
    displayName?: string;
  }): Player => {
    const existing = deps.playerRepo.findByProvider(
      input.provider,
      input.providerId,
    );
    if (existing) return existing; // repeat login reuses the same player

    const player: Player = {
      playerId: uuid(),
      provider: input.provider,
      providerId: input.providerId,
      displayName: input.displayName,
      createdAt: Date.now(),
    };
    return deps.playerRepo.create(player);
  };

  return {
    findOrCreatePlayer,

    async login(provider, credential) {
      const authenticator = authenticators.get(provider);
      if (!authenticator) {
        throw new ApiError(
          400,
          "invalid_request",
          `No authenticator registered for provider '${provider}' (steam-only this phase)`,
        );
      }

      const identity = await authenticator.authenticate(credential);
      const player = findOrCreatePlayer({
        provider,
        providerId: identity.providerId,
        displayName: identity.displayName,
      });
      const token = tokenService.issueToken(player.playerId);

      return { player, token };
    },
  };
}
