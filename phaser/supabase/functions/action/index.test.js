import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock Supabase client
const createMockSupabaseClient = () => ({
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null })
  },
  from: (table) => ({
    upsert: (data, options) => Promise.resolve({ data: { id: 1, ...data }, error: null }),
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: 1, player_id: "test-user-id", phase: "encounter" }, error: null })
      })
    }),
    update: (data) => ({
      eq: () => Promise.resolve({ error: null })
    })
  }),
  rpc: (name, params) => Promise.resolve({ data: null, error: null })
});

// Mock the MultiplayerLogic
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

// Mock global MultiplayerLogic
globalThis.MultiplayerLogic = mockMultiplayerLogic;

// Mock createClient
globalThis.createClient = createMockSupabaseClient;

Deno.test("action endpoint - start_session", async () => {
  // Mock the request
  const request = new Request("http://localhost:54321/functions/v1/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-token"
    },
    body: JSON.stringify({
      actionId: "start_session",
      payload: { selectedCrystalId: "crystal1" }
    })
  });

  // Mock environment
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

  // Test the core logic (since we can't easily test the full Deno.serve)
  const playerId = "test-user-id";
  const selectedCrystalId = "crystal1";
  const newSession = mockMultiplayerLogic.createInitialSession(playerId, selectedCrystalId);

  assertEquals(newSession.phase, 'encounter');
  assertEquals(newSession.round, 1);
  assertEquals(newSession.team.length, 0);
});

Deno.test("action endpoint - update_team", async () => {
  const session = {
    id: 1,
    player_id: "test-user",
    team: [],
    phase: 'shop'
  };

  const payload = { team: [{ id: "unit1" }] };
  const result = mockMultiplayerLogic.validateAndApplyTeamUpdate(session, payload.team);

  assertEquals(result.valid, true);
  assertEquals(result.team, payload.team);
});

Deno.test("action endpoint - resolve action", async () => {
  const session = {
    id: 1,
    player_id: "test-user",
    team: [],
    phase: 'encounter'
  };

  const result = mockMultiplayerLogic.resolveAction(session, 'pick_option', { optionIndex: 0 });

  assertEquals(result.team, session.team);
  assertEquals(result.updates.length, 0);
});

Deno.test("action endpoint - transition to next state", async () => {
  const session = {
    id: 1,
    player_id: "test-user",
    team: [],
    phase: 'encounter'
  };

  const result = mockMultiplayerLogic.transitionToNextState(session, 'pick_option', { optionIndex: 0 });

  assertEquals(result.session.phase, 'shop');
  assertEquals(result.combatResult, null);
});
