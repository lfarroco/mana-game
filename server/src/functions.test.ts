/**
 * Firebase Functions hosting-slice test.
 *
 * Covers the shared Express-app factory (`functionsApp.ts`) — the trigger
 * wrapper (`functions.ts`) itself loads the `firebase-functions` SDK, whose
 * dependency graph does not import under the repo's jest ESM setup, so it is
 * verified by the `dist/functions.cjs` require smoke check instead (see
 * docs/firebase-backend.md §Phase F1).
 */

import request from "supertest";
import { getApiApp, resetApiAppForTests } from "./functionsApp";

afterEach(() => {
  resetApiAppForTests();
});

test("wrapped app serves /health without auth", async () => {
  const res = await request(getApiApp()).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});

test("factory caches per instance and resets on demand", () => {
  const first = getApiApp();
  expect(getApiApp()).toBe(first);
  resetApiAppForTests();
  expect(getApiApp()).not.toBe(first);
});
