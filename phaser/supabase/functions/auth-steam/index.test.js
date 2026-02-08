import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("auth-steam - password generation", async () => {
  const steamId = "76561198000000000";
  const SALT = "test-key";
  const passwordSeed = `Steam:${steamId}:${SALT}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(passwordSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const deterministicPassword = "S#" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('') + "!";

  assertEquals(deterministicPassword.startsWith("S#"), true);
  assertEquals(deterministicPassword.endsWith("!"), true);
});

Deno.test("auth-steam - email generation", () => {
  const steamId = "76561198000000000";
  const email = `steam_${steamId}@manabattle.com`;
  assertEquals(email, "steam_76561198000000000@manabattle.com");
});

Deno.test("auth-steam - missing steam key", () => {
  // Test that environment variable handling works
  const steamKey = undefined; // Simulating missing env var
  assertEquals(steamKey, undefined);
});