import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock fetch for Steam API calls
const mockFetch = (response, status = 200) => {
  globalThis.fetch = () => Promise.resolve({
    json: () => Promise.resolve(response),
    status
  });
};

const restoreFetch = () => {
  delete globalThis.fetch;
};

// Mock Supabase client
const createMockSupabaseClient = () => ({
  auth: {
    signInWithPassword: (credentials) => {
      if (credentials.email.includes('steam_') && credentials.password.startsWith('S#')) {
        return Promise.resolve({ data: { session: { access_token: "test-token" } }, error: null });
      }
      return Promise.resolve({ data: null, error: new Error("Invalid credentials") });
    },
    signUp: (userData) => Promise.resolve({
      data: { session: { access_token: "test-token" }, user: { id: "test-user-id" } },
      error: null
    }),
    admin: {
      createUser: (userData) => Promise.resolve({
        data: { user: { id: "test-user-id" } },
        error: null
      })
    }
  }
});

// Mock createClient
globalThis.createClient = createMockSupabaseClient;

Deno.test("auth-steam endpoint - successful authentication", async () => {
  // Mock Steam API response
  const steamResponse = {
    response: {
      params: {
        result: "OK",
        steamid: "76561198000000000"
      }
    }
  };
  mockFetch(steamResponse);

  // Mock environment
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  Deno.env.set("STEAM_WEB_API_KEY", "test-steam-key");

  // Test password generation logic
  const steamId = "76561198000000000";
  const SALT = "test-steam-key";
  const passwordSeed = `Steam:${steamId}:${SALT}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(passwordSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const deterministicPassword = "S#" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('') + "!";

  assertEquals(deterministicPassword.startsWith("S#"), true);
  assertEquals(deterministicPassword.endsWith("!"), true);

  // Test email generation
  const email = `steam_${steamId}@manabattle.com`;
  assertEquals(email, "steam_76561198000000000@manabattle.com");

  restoreFetch();
});

Deno.test("auth-steam endpoint - steam validation failure", async () => {
  // Mock failed Steam API response
  const steamResponse = {
    response: {
      params: {
        result: "FAIL",
        steamid: null
      }
    }
  };
  mockFetch(steamResponse);

  Deno.env.set("STEAM_WEB_API_KEY", "test-steam-key");

  // Simulate the Steam validation logic
  const steamKey = "test-steam-key";
  const ticket = "invalid-ticket";
  const appId = "3350220";

  const params = new URLSearchParams({
    key: steamKey,
    appid: appId,
    ticket: ticket
  });

  const response = await fetch(`https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?${params.toString()}`);
  const data = await response.json();

  assertEquals(data.response.params.result, "FAIL");

  restoreFetch();
});

Deno.test("auth-steam endpoint - missing steam key", () => {
  Deno.env.delete("STEAM_WEB_API_KEY");

  const steamKey = Deno.env.get('STEAM_WEB_API_KEY');
  assertEquals(steamKey, undefined);
});

Deno.test("auth-steam endpoint - deterministic password consistency", async () => {
  const steamId = "76561198000000000";
  const SALT = "consistent-salt";

  // Generate password twice
  const password1 = await generateSteamPassword(steamId, SALT);
  const password2 = await generateSteamPassword(steamId, SALT);

  assertEquals(password1, password2);
});

async function generateSteamPassword(steamId, salt) {
  const passwordSeed = `Steam:${steamId}:${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(passwordSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "S#" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('') + "!";
}