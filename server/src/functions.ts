/**
 * Firebase Functions entry point — hosts the authoritative game server API.
 *
 * The entire Express app (`createApp`, same routes/auth/CORS as the VM
 * deployment) runs inside one 2nd-gen HTTPS function. One Firebase project =
 * one function URL (e.g. `https://api-<project>-<hash>.<region>.run.app`),
 * which the clients reach via `MANA_SERVER_URL` — no client protocol changes.
 *
 * Runtime notes:
 * - The Express app is built lazily on first request (see `functionsApp.ts`)
 *   and reused across warm invocations. Config comes from the same `MANA_*`
 *   env vars (`loadConfig`); `MANA_STEAM_WEB_API_KEY` is a Secret Manager
 *   secret (declared below so deploys fail fast when it is missing), the rest
 *   are plain function env.
 * - Persistence MUST be Firestore in production (see
 *   `docs/firebase-backend.md`): the in-memory repos lose everything between
 *   invocations and diverge across instances. better-sqlite3 cannot run here
 *   (no durable disk, native module). Pass Firestore repos via the `AppDeps`
 *   passthrough — local emulator runs keep the in-memory defaults.
 * - Per-instance state (e.g. the rating-applied set in `sessionService`) does
 *   not survive scale-out: exactly-once semantics must come from Firestore
 *   transactions, not memory (see the Firestore slice contract in
 *   `docs/firebase-backend.md`).
 */

import { onRequest } from "firebase-functions/v2/https";
import { getApiApp } from "./functionsApp";

export const api = onRequest(
  {
    region: process.env.MANA_FUNCTIONS_REGION ?? "us-central1",
    // Secret Manager secret, exposed as an env var at runtime. Deploys fail
    // fast when it does not exist — mirrors the compose fast-fail on a
    // missing MANA_STEAM_WEB_API_KEY.
    secrets: ["MANA_STEAM_WEB_API_KEY"],
  },
  (req, res) => {
    getApiApp()(req, res);
  },
);
