/**
 * Bearer auth middleware — replaces the dev-only X-Player-Id header.
 *
 * Parses `Authorization: Bearer <token>`, looks up the SHA-256 hash in the
 * TokenRepo, enforces expiry, and attaches the player id to the request.
 * Missing/malformed headers → 401 `missing_token`; unknown or expired tokens
 * → 401 `invalid_token`. Only the token hash is ever persisted (tokenService),
 * so lookups go through the same hashing the issue path uses.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../errors";
import type { TokenRepo } from "../../persistence/repositories";
import { createTokenService } from "../../services/tokenService";

// Extend Express's Request with the authenticated player id (set by requireAuth).
declare global {
  namespace Express {
    interface Request {
      playerId?: string;
    }
  }
}

export function requireAuth(deps: { tokenRepo: TokenRepo }): RequestHandler {
  const { hashToken } = createTokenService(deps.tokenRepo);

  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.header("authorization");

    if (!header) {
      next(new ApiError(401, "missing_token", "Missing Authorization header"));
      return;
    }

    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) {
      next(
        new ApiError(
          401,
          "missing_token",
          "Malformed Authorization header — expected 'Bearer <token>'",
        ),
      );
      return;
    }

    const token = match[1].trim();
    if (!token) {
      next(new ApiError(401, "missing_token", "Empty bearer token"));
      return;
    }

    const record = deps.tokenRepo.findByHash(hashToken(token));
    if (!record || record.expiresAt <= Date.now()) {
      next(new ApiError(401, "invalid_token", "Invalid or expired token"));
      return;
    }

    req.playerId = record.playerId;
    next();
  };
}
