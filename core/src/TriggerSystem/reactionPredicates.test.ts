/// <reference types="jest" />

/**
 * B1 — `when` predicates on reactions (docs/wacky-content-plan.md).
 *
 * Verifies that a reaction's optional `when` board-state gate is honored by
 * processReactions, that reactions without `when` are unaffected, and that
 * combined predicates use AND semantics. All gates are pure + deterministic.
 */

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  filterLogs,
} from "../__test_utils__/combatHarness";
import * as TriggerSystem from "./TriggerSystem";
import * as Models from "../Models";
import { increasePower, self } from "../data/effectBuilders";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

/** A reaction that logs visibly (reaction log entry) when it fires. */
function damageReaction(
  when?: Models.ReactionPredicate,
): Models.EffectReaction {
  return {
    position: "allies",
    effectId: "damage",
    effects: [increasePower(5, self)],
    ...(when ? { when } : {}),
  };
}

function makeReactor(when?: Models.ReactionPredicate): Models.Unit {
  const reactor = makeTestUnit({
    effects: [],
    reactions: [damageReaction(when)],
    position: [0, 0],
  });
  reactor.id = "reactor";
  return reactor;
}

function makeTriggerer(): Models.Unit {
  const triggerer = makeTestUnit({
    effects: [{ id: "damage" }],
    position: [0, 1],
  });
  triggerer.id = "triggerer";
  return triggerer;
}

/**
 * Build a combat with the given player units plus an inert player core, then
 * trigger a "damage" reaction from the triggerer. Returns the env and the
 * reactor unit from combat state.
 */
function setupAndTrigger(units: Models.Unit[]) {
  const core = makeTestUnit({ effects: [], isCore: true, position: [2, 2] });
  core.id = "player-core";
  const { env } = setupCombat(units.concat(core));
  const byId = (id: string) => env.combatState.units.find((u) => u.id === id)!;
  TriggerSystem.processReactions(env, byId("triggerer"), { id: "damage" });
  return env;
}

function reactorFired(env: Models.CombatEnvironment): boolean {
  return filterLogs(env.logger.getLogs(), "reaction").some(
    (l) => l.unitId === "reactor",
  );
}

describe("reaction predicates (B1)", () => {
  it("keeps default behavior: a reaction without `when` always fires", () => {
    const env = setupAndTrigger([makeReactor(), makeTriggerer()]);
    expect(reactorFired(env)).toBe(true);
  });

  it("respects minAllies — suppressed when the team is too small", () => {
    // Team = reactor + triggerer + inert core = 3 allies (incl. the reactor).
    const env = setupAndTrigger([
      makeReactor({ minAllies: 4 }),
      makeTriggerer(),
    ]);
    expect(reactorFired(env)).toBe(false);
  });

  it("respects minAllies — fires once the team is big enough", () => {
    const env = setupAndTrigger([
      makeReactor({ minAllies: 3 }),
      makeTriggerer(),
    ]);
    expect(reactorFired(env)).toBe(true);
  });

  it("respects maxAllies — suppressed when the team is too big", () => {
    const env = setupAndTrigger([
      makeReactor({ maxAllies: 2 }),
      makeTriggerer(),
    ]);
    expect(reactorFired(env)).toBe(false);
  });

  it("respects maxAllies — fires while the team is within the cap", () => {
    const env = setupAndTrigger([
      makeReactor({ maxAllies: 3 }),
      makeTriggerer(),
    ]);
    expect(reactorFired(env)).toBe(true);
  });

  it("respects ofTypes — requires at least one ally with the effect", () => {
    // No poison ally on the team → suppressed.
    const withoutPoison = setupAndTrigger([
      makeReactor({ ofTypes: ["poison"] }),
      makeTriggerer(),
    ]);
    expect(reactorFired(withoutPoison)).toBe(false);
  });

  it("ofTypes fires once an ally with the required effect joins the team", () => {
    const poisonAlly = makeTestUnit({
      effects: [{ id: "poison" }],
      position: [1, 0],
    });
    poisonAlly.id = "poison-ally";
    const env = setupAndTrigger([
      makeReactor({ ofTypes: ["poison"] }),
      makeTriggerer(),
      poisonAlly,
    ]);
    expect(reactorFired(env)).toBe(true);
  });

  it("combines predicates with AND semantics", () => {
    const poisonAlly = makeTestUnit({
      effects: [{ id: "poison" }],
      position: [1, 0],
    });
    poisonAlly.id = "poison-ally";

    // Both hold → fires.
    const bothHold = setupAndTrigger([
      makeReactor({ minAllies: 3, ofTypes: ["poison"] }),
      makeTriggerer(),
      poisonAlly,
    ]);
    expect(reactorFired(bothHold)).toBe(true);

    // ofTypes holds but minAllies fails (6 required, team has 5) → suppressed.
    const sizeFails = setupAndTrigger([
      makeReactor({ minAllies: 6, ofTypes: ["poison"] }),
      makeTriggerer(),
      makeTestUnit({ effects: [], position: [1, 1] }),
      poisonAlly,
    ]);
    expect(reactorFired(sizeFails)).toBe(false);
  });
});
