/// <reference types="jest" />

/**
 * "Can't react to reactions" — the game rule that an effect which was itself
 * triggered as a reaction never emits reaction triggers. The cast-level
 * dispatch (TriggerSystem.processEffectIO) and the on_crystal_hit emit were
 * already guarded; this pins the internal emits too:
 *
 *   - a critical hit from reaction-sourced damage/shield/poison/regen/heal
 *     never fires `on_crit`
 *   - a reaction-sourced heal never fires `on_over_heal`
 *   - a reaction-sourced haste/slow never fires `re_hasted`/`re_slow`
 *
 * Without these, thorns-style chains ping-pong (e.g. crystal hit → thorns
 * damage crit → on_crit → …) and heal/shield loops feed themselves.
 */
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as CombatRunner from "../Combat/CombatRunner";
import * as Constants from "../math/Constants";
import * as Models from "../Models";
import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runFrames,
  filterLogs,
  runUntil,
} from "../__test_utils__/combatHarness";
import {
  damage,
  haste,
  heal,
  increasePower,
  poison,
  reaction,
  regen,
  self,
  shield,
  slow,
} from "../data/effectBuilders";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

/** Build combat state with explicit enemy units (mirrors onCrystalHit.test.ts). */
function setupWithEnemies(
  playerUnits: Models.Unit[],
  enemyUnits: Models.Unit[],
) {
  const session: Models.SessionData = {
    id: "no-chains-session",
    player_id: "p1",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 1,
    step: 0,
    seed: "no-chains-seed",
    initial_seed: "no-chains-seed",
    options: [],
    team: { units: playerUnits },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
  };
  const combatState = CombatSimulation.createCombatState(session, enemyUnits);
  const combatRunner = CombatRunner.runCombat(session, combatState);
  return { combatRunner, combatState };
}

function makeCore(force: string, id: string, life: number): Models.Unit {
  const core = makeTestUnit({
    effects: [],
    isCore: true,
    cooldown: 99999,
    life,
    position: force === Constants.FORCE_ID_PLAYER ? [1, 1] : [0, 2],
  });
  core.force = force;
  core.id = id;
  return core;
}

describe("can't react to reactions", () => {
  it("reaction-sourced damage that crits never fires on_crit (thorns)", () => {
    // A 100%-crit thorns unit: retaliates when its crystal is hit, and would
    // gain power on every on_crit — the guard must stop its own reaction
    // damage from feeding on_crit.
    const playerCore = makeCore(Constants.FORCE_ID_PLAYER, "player-core", 1000);
    const thorns = makeTestUnit({
      effects: [],
      reactions: [
        reaction("on_crystal_hit", "enemies", damage, "enemy"),
        reaction("on_crit", "allies", increasePower(5, self)),
      ],
      power: 20,
      critical: 100,
      cooldown: 99999, // reaction-only — never casts
      position: [0, 0],
    });
    thorns.force = Constants.FORCE_ID_PLAYER;
    thorns.id = "thorns";

    const enemyCore = makeCore(Constants.FORCE_ID_CPU, "enemy-core", 5000);
    const attacker = makeTestUnit({
      effects: [damage],
      power: 10,
      cooldown: 1000,
      position: [0, 1],
    });
    attacker.force = Constants.FORCE_ID_CPU;
    attacker.id = "attacker";

    const { combatRunner, combatState } = setupWithEnemies(
      [playerCore, thorns],
      [enemyCore, attacker],
    );

    // Wait for several thorns retaliations to land.
    runUntil(
      combatRunner,
      combatState,
      (logs) =>
        filterLogs(logs, "damage_hit").filter((h) => h.sourceId === "thorns")
          .length >= 3,
    );

    const csThorns = combatState.unitById.get("thorns")!;
    // The thorns reaction dealt damage (retaliation works)…
    expect(
      filterLogs(combatRunner.getEnv().logger.getLogs(), "damage_hit").filter(
        (h) => h.sourceId === "thorns",
      ).length,
    ).toBeGreaterThanOrEqual(3);
    // …but its 100%-crit reaction damage never fired on_crit, so the unit
    // gained no power.
    expect(csThorns.power).toBe(20);
  });

  it("reaction-sourced heal never fires on_over_heal", () => {
    // The reactor heals whenever an ally casts heal (reaction-sourced), and
    // gains power when on_over_heal fires. Every heal overheals the near-full
    // core, so the cast heals legitimately fire on_over_heal — the reaction
    // heals must not add any.
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        reaction("heal", "allies", heal),
        reaction("on_over_heal", "allies", increasePower(5, self)),
      ],
      power: 100,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "heal-reactor";

    const healer = makeTestUnit({
      effects: [heal],
      power: 20,
      cooldown: 1000,
      position: [1, 0],
    });
    healer.id = "healer";

    const { combatState, combatRunner } = setupCombat([reactor, healer]);
    // Keep the core near full so every heal overflows.
    combatState.playerCore.life = combatState.playerCore.maxLife - 5;

    const logs = runFrames(combatRunner, combatState, 600);

    const castHeals = filterLogs(logs, "heal_hit").filter(
      (l) => l.sourceId === "healer",
    ).length;
    const reactionHeals = filterLogs(logs, "heal_hit").filter(
      (l) => l.sourceId === "heal-reactor",
    ).length;

    // The reaction heal actually fired…
    expect(reactionHeals).toBeGreaterThan(0);
    // …but only the cast heals fed on_over_heal (+5 each on top of the
    // reactor's starting power of 100).
    const csReactor = combatState.unitById.get("heal-reactor")!;
    expect(csReactor.power).toBe(100 + 5 * castHeals);
  });

  it("reaction-sourced shield that crits never fires on_crit", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        reaction("shield", "allies", shield),
        reaction("on_crit", "allies", increasePower(5, self)),
      ],
      power: 20,
      critical: 100,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "shield-reactor";

    const shielder = makeTestUnit({
      effects: [shield],
      power: 20,
      cooldown: 1000,
      position: [1, 0],
    });
    shielder.id = "shielder";

    const { combatState, combatRunner } = setupCombat([reactor, shielder]);

    const logs = runFrames(combatRunner, combatState, 600);

    // The reaction shield fired…
    expect(
      filterLogs(logs, "shield_hit").some(
        (l) => l.sourceId === "shield-reactor",
      ),
    ).toBe(true);
    // …but its 100%-crit reaction shield never fired on_crit.
    expect(combatState.unitById.get("shield-reactor")!.power).toBe(20);
  });

  it("reaction-sourced haste never fires re_hasted", () => {
    // Heal-cast overheals fire a reaction haste (reaction-sourced) on the
    // already-hasted reactor; the re_hasted canary must stay silent.
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        reaction("on_over_heal", "allies", haste(500, self)),
        reaction("re_hasted", "allies", increasePower(5, self)),
      ],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "rehasted-reactor";
    reactor.hasted = 1000;

    const healer = makeTestUnit({
      effects: [heal],
      power: 20,
      cooldown: 1000,
      position: [1, 0],
    });
    healer.id = "healer";

    const { combatState, combatRunner } = setupCombat([reactor, healer]);
    combatState.playerCore.life = combatState.playerCore.maxLife - 5;

    const logs = runFrames(combatRunner, combatState, 600);

    // The reaction haste actually landed…
    expect(
      filterLogs(logs, "haste_hit").some(
        (l) => l.sourceId === "rehasted-reactor",
      ),
    ).toBe(true);
    // …but never fired re_hasted, so the canary gained no power.
    expect(combatState.unitById.get("rehasted-reactor")!.power).toBe(10);
  });

  it("reaction-sourced slow never fires re_slow", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        reaction("on_over_heal", "allies", slow(500, self)),
        reaction("re_slow", "allies", increasePower(5, self)),
      ],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "reslow-reactor";
    reactor.slowed = 1000;

    const healer = makeTestUnit({
      effects: [heal],
      power: 20,
      cooldown: 1000,
      position: [1, 0],
    });
    healer.id = "healer";

    const { combatState, combatRunner } = setupCombat([reactor, healer]);
    combatState.playerCore.life = combatState.playerCore.maxLife - 5;

    const logs = runFrames(combatRunner, combatState, 600);

    // The reaction slow actually landed…
    expect(
      filterLogs(logs, "slow_hit").some((l) => l.sourceId === "reslow-reactor"),
    ).toBe(true);
    // …but never fired re_slow, so the canary gained no power.
    expect(combatState.unitById.get("reslow-reactor")!.power).toBe(10);
  });

  it("thorns mirror terminates decisively (retaliation can't ping-pong)", () => {
    // Both forces retaliate on_crystal_hit with damage. Retaliation damage
    // is reaction-sourced (deferred + isReaction), so it emits no
    // on_crystal_hit of its own — a mirror that ping-ponged would flood the
    // log and trip the runaway guard instead of resolving.
    const mirror = (force: string, id: string): Models.Unit => {
      const u = makeTestUnit({
        effects: [damage],
        reactions: [reaction("on_crystal_hit", "enemies", damage, "enemy")],
        power: 60,
        cooldown: 1500,
        life: 800,
        position: force === Constants.FORCE_ID_PLAYER ? [1, 0] : [0, 1],
      });
      u.force = force;
      u.id = id;
      return u;
    };
    const playerTeam = [
      makeCore(Constants.FORCE_ID_PLAYER, "player-core", 800),
      mirror(Constants.FORCE_ID_PLAYER, "p-thorns"),
    ];
    const { combatState } = setupWithEnemies(playerTeam, [
      makeCore(Constants.FORCE_ID_CPU, "enemy-core", 800),
      mirror(Constants.FORCE_ID_CPU, "e-thorns"),
    ]);
    const session = {
      id: "thorns-mirror",
      seed: "thorns-mirror",
      team: { units: playerTeam },
    } as Models.SessionData;
    const final = CombatSimulation.simulateCombat(session, combatState);

    // Exactly one outcome with a small log and no runaway_combat marker.
    // (The mirror usually ends in mutual annihilation — both_won — which is
    // a legitimate draw, not a loop: a ping-pong would flood the log and
    // trip the guard instead of resolving.)
    expect(filterLogs(final.logs, "runaway_combat")).toHaveLength(0);
    expect(final.logs.length).toBeLessThan(2000);
    const outcome = filterLogs(final.logs, "outcome");
    expect(outcome).toHaveLength(1);
    expect(["player_won", "player_lost", "both_won"]).toContain(
      outcome[0].result,
    );
  });
});

describe("reaction-sourced basics don't feed thresholds", () => {
  // For each basic: a caster casts it (cast-sourced stats DO accumulate), and
  // the reactor responds with the same basic (reaction-sourced — must NOT
  // accumulate, so its stats never cross the threshold canary).
  const CASES = [
    {
      name: "damage",
      cast: damage,
      respond: damage,
      threshold: "every_100_damage",
      statPerCast: 20, // power 20
      thresholdAmount: 100,
      hitType: "damage_hit" as const,
    },
    {
      name: "heal",
      cast: heal,
      respond: heal,
      threshold: "every_100_heal",
      statPerCast: 20,
      thresholdAmount: 100,
      hitType: "heal_hit" as const,
    },
    {
      name: "shield",
      cast: shield,
      respond: shield,
      threshold: "every_100_shield",
      statPerCast: 20,
      thresholdAmount: 100,
      hitType: "shield_hit" as const,
    },
    {
      name: "poison",
      cast: poison,
      respond: poison,
      threshold: "every_10_poison",
      statPerCast: 2, // power 20 × 0.1
      thresholdAmount: 10,
      hitType: "poison_hit" as const,
    },
    {
      name: "regen",
      cast: regen,
      respond: regen,
      threshold: "every_10_regen",
      statPerCast: 2,
      thresholdAmount: 10,
      hitType: "regen_hit" as const,
    },
  ];

  it.each(CASES)(
    "reaction-sourced $name never feeds $threshold",
    ({ cast, respond, threshold, statPerCast, thresholdAmount, hitType }) => {
      // A roomy player core so heals always land fully (maxLife 10000, life 100).
      const core = makeTestUnit({
        effects: [],
        isCore: true,
        cooldown: 99999,
        life: 100,
        position: [1, 1],
      });
      core.id = "roomy-core";
      core.maxLife = 10000;

      const caster = makeTestUnit({
        effects: [cast],
        power: 20,
        cooldown: 1000,
        position: [0, 0],
      });
      caster.id = "caster";

      const reactor = makeTestUnit({
        effects: [],
        reactions: [
          reaction(cast.id, "allies", respond),
          reaction(threshold as never, "allies", increasePower(5, self)),
        ],
        power: 100,
        cooldown: 99999,
        position: [1, 0],
      });
      reactor.id = "reactor";

      const { combatState, combatRunner } = setupCombat([
        core,
        caster,
        reactor,
      ]);

      const logs = runFrames(combatRunner, combatState, 600);

      const castHits = filterLogs(logs, hitType).filter(
        (l) => l.sourceId === "caster",
      ).length;
      const reactionHits = filterLogs(logs, hitType).filter(
        (l) => l.sourceId === "reactor",
      ).length;

      // The reaction fired (its effect landed)…
      expect(reactionHits).toBeGreaterThan(0);
      // …but its stats were excluded: only the CAST hits crossed the
      // threshold (+5 power per crossing on the canary, starting power 100).
      const expectedCrossings = Math.floor(
        (castHits * statPerCast) / thresholdAmount,
      );
      expect(expectedCrossings).toBeGreaterThan(0); // the test must be able to distinguish
      expect(combatState.unitById.get("reactor")!.power).toBe(
        100 + 5 * expectedCrossings,
      );
    },
  );
});
