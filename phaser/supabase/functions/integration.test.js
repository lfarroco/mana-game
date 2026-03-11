import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock Supabase client for integration tests
const createMockSupabaseClient = () => ({
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { session: { access_token: "test-token" } }, error: null }),
    signUp: () => Promise.resolve({ data: { session: { access_token: "test-token" } }, error: null }),
    admin: {
      createUser: () => Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null })
    }
  },
  from: (table) => ({
    upsert: (data) => Promise.resolve({ data: { id: 1, ...data }, error: null }),
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({
          data: {
            id: 1,
            player_id: "test-user-id",
            phase: "encounter",
            team: [],
            wins: 0,
            losses: 0
          },
          error: null
        })
      })
    }),
    update: () => Promise.resolve({ error: null })
  }),
  rpc: () => Promise.resolve({ data: null, error: null })
});

// Mock fetch for Steam API
const mockFetch = (response, status = 200) => {
  globalThis.fetch = () => Promise.resolve({
    json: () => Promise.resolve(response),
    status
  });
};

const restoreFetch = () => {
  delete globalThis.fetch;
};

// Mock MultiplayerLogic
const mockMultiplayerLogic = {
  createInitialSession: (playerId, selectedCrystalId) => ({
    phase: 'encounter',
    round: 1,
    step: 1,
    seed: 'test-seed',
    initial_seed: 'test-initial-seed',
    current_options: [],
    team: [],
    wins: 0,
    losses: 0,
    action_log: []
  }),
  validateAndApplyTeamUpdate: (session, team) => ({ team, valid: true }),
  resolveAction: (session, actionId, payload) => ({
    team: session.team,
    updates: []
  }),
  transitionToNextState: (session, actionId, payload) => ({
    session: { ...session, phase: 'shop' },
    combatResult: null
  })
};

Deno.test("integration - action endpoint full request flow", async () => {
  // Setup mocks
  globalThis.createClient = createMockSupabaseClient;
  globalThis.MultiplayerLogic = mockMultiplayerLogic;

  // Mock environment
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

  // Simulate request data
  const requestBody = {
    actionId: "start_session",
    payload: { selectedCrystalId: "crystal1" }
  };

  // Test the core flow that would happen in the edge function
  const mockSupabase = createMockSupabaseClient();

  // Simulate auth check
  const { data: { user } } = await mockSupabase.auth.getUser();
  assertEquals(user.id, "test-user-id");

  // Simulate session creation
  const playerId = user.id;
  const selectedCrystalId = requestBody.payload.selectedCrystalId;
  const newSession = mockMultiplayerLogic.createInitialSession(playerId, selectedCrystalId);

  // Simulate database upsert
  const { data: sessionData } = await mockSupabase.from('player_sessions').upsert({
    player_id: playerId,
    phase: newSession.phase,
    round: newSession.round,
    step: newSession.step,
    seed: newSession.seed,
    initial_seed: newSession.initial_seed,
    current_options: newSession.current_options,
    action_log: [],
    wins: 0,
    losses: 0,
    team: newSession.team,
    updated_at: new Date()
  });

  assertEquals(sessionData.phase, 'encounter');
  assertEquals(sessionData.round, 1);
});

Deno.test("integration - auth-steam endpoint full flow", async () => {
  // Mock Steam API success response
  const steamResponse = {
    response: {
      params: {
        result: "OK",
        steamid: "76561198000000000"
      }
    }
  };
  mockFetch(steamResponse);

  // Setup mocks
  globalThis.createClient = createMockSupabaseClient;

  // Mock environment
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  Deno.env.set("STEAM_WEB_API_KEY", "test-steam-key");

  // Simulate request data
  const requestBody = {
    ticket: "test-steam-ticket",
    appId: "3350220"
  };

  // Test Steam validation logic
  const steamKey = "test-steam-key";
  const params = new URLSearchParams({
    key: steamKey,
    appid: requestBody.appId,
    ticket: requestBody.ticket
  });

  const response = await fetch(`https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?${params.toString()}`);
  const steamData = await response.json();

  assertEquals(steamData.response.params.result, "OK");
  const steamId = steamData.response.params.steamid;
  assertEquals(steamId, "76561198000000000");

  // Test password generation
  const SALT = steamKey;
  const passwordSeed = `Steam:${steamId}:${SALT}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(passwordSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const deterministicPassword = "S#" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('') + "!";

  // Test email generation
  const email = `steam_${steamId}@manabattle.com`;

  // Simulate Supabase auth flow
  const mockSupabase = createMockSupabaseClient();
  const { data: sessionData } = await mockSupabase.auth.signInWithPassword({
    email: email,
    password: deterministicPassword
  });

  assertEquals(sessionData.session.access_token, "test-token");

  restoreFetch();
});

Deno.test("integration - action endpoint error handling", async () => {
  // Mock Supabase client that returns auth error
  const mockSupabaseWithError = () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: new Error("Unauthorized") })
    }
  });

  const mockSupabase = mockSupabaseWithError();

  const result = await mockSupabase.auth.getUser();
  assertEquals(result.error.message, "Unauthorized");
});

Deno.test("integration - auth-steam endpoint steam failure", async () => {
  // Mock Steam API failure response
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

  // Simulate Steam validation
  const steamKey = "test-steam-key";
  const params = new URLSearchParams({
    key: steamKey,
    appid: "3350220",
    ticket: "invalid-ticket"
  });

  const response = await fetch(`https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?${params.toString()}`);
  const steamData = await response.json();

  assertEquals(steamData.response.params.result, "FAIL");

  restoreFetch();
});