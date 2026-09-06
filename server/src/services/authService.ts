/**
 * Auth service — the application layer for identity.
 *
 * Core model (docs/auth.md): *a provider proves identity once; the server owns
 * players and sessions.* Credential validation is provider-specific (one
 * `Authenticator` per provider); everything after it is provider-agnostic —
 * `findOrCreatePlayer` upserts the player, then `issueToken` mints a bearer
 * token. A future provider (Firebase/Supabase/…) is a single new
 * `Authenticator` + route; sessions and matchmaking never know the provider.
 *
 * `steam` (Electron), `itch` (web build), and `google` (Android / web) log
 * in through provider `Authenticator`s; guests mint a credential-less player
 * via `createGuest` (no authenticator — there is nothing to verify).
 */

import { v4 as uuid } from "uuid";
import { ApiError } from "../errors";
import type {
  Player,
  PlayerProvider,
  PlayerRepo,
  TokenRepo,
} from "../persistence/repositories";
import { createGuestPlayer } from "./playerService";
import { createTokenService } from "./tokenService";

/** Verified provider identity extracted from a credential. */
export type ProviderIdentity = {
  providerId: string;
  /**
   * Display name. Steam: unverified client-supplied persona (docs/auth.md);
   * itch: server-verified username (docs/itchio-auth.md).
   */
  displayName?: string;
};

/**
 * Provider-specific credential validation. `steam` and `itch` are registered
 * at the route layer; each `authenticate` calls the provider's API (Steam Web
 * API / api.itch.io/profile) and returns the verified provider id.
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
  }): Promise<Player>;
  /**
   * Provider-agnostic login: validate via the provider's Authenticator, upsert
   * the player, and mint a bearer token. `credential` is provider-specific
   * (steam = `{ ticket, identity, appId }`).
   */
  login(provider: PlayerProvider, credential: unknown): Promise<LoginResult>;
  /**
   * Guest login: mint a fresh credential-less player (random `AdjectiveNounNN`
   * handle unless a name is supplied) and a Bearer [REDACTED] Guests have no
   * credential to validate, so every call creates a new player.
   */
  createGuest(displayName?: string): Promise<LoginResult>;
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

  const findOrCreatePlayer = async (input: {
    provider: PlayerProvider;
    providerId: string;
    displayName?: string;
  }): Promise<Player> => {
    const existing = await deps.playerRepo.findByProvider(
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
          `No authenticator registered for provider '${provider}' (configured providers only)`,
        );
      }

      const identity = await authenticator.authenticate(credential);
      const player = await findOrCreatePlayer({
        provider,
        providerId: identity.providerId,
        displayName: identity.displayName,
      });
      const token = await tokenService.issueToken(player.playerId);

      return { player, token };
    },

    async createGuest(displayName) {
      const player = await createGuestPlayer(displayName, {
        playerRepo: deps.playerRepo,
      });
      const token = await tokenService.issueToken(player.playerId);

      return { player, token };
    },
  };
}
