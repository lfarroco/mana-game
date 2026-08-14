/// <reference types="jest" />

import { buildRunCompleteSession } from "./runComplete";
import * as SessionManagement from "../session/SessionManagement";

describe("buildRunCompleteSession", () => {
  it("forces the requested phase with demo values when the session is empty", () => {
    const base = SessionManagement.createInitialSession("p1", "seed-1");
    const session = buildRunCompleteSession(base, "game_over", {});

    expect(session.phase).toBe("game_over");
    expect(session.wins).toBe(6);
    expect(session.losses).toBe(4);
    expect(session.initial_seed).toBe("seed-1");
  });

  it("preserves existing wins/losses from the current session", () => {
    const base = {
      ...SessionManagement.createInitialSession("p1", "seed-1"),
      wins: 3,
      losses: 1,
    };
    const session = buildRunCompleteSession(base, "victory", {});

    expect(session.phase).toBe("victory");
    expect(session.wins).toBe(3);
    expect(session.losses).toBe(1);
  });

  it("honors explicit options over session defaults", () => {
    const base = SessionManagement.createInitialSession("p1", "seed-1");
    const session = buildRunCompleteSession(base, "game_over", { wins: 12, losses: 3 });

    expect(session.wins).toBe(12);
    expect(session.losses).toBe(3);
  });

  it("clears combat state so no combat teardown runs on the jump", () => {
    const base = {
      ...SessionManagement.createInitialSession("p1", "seed-1"),
      combatState: {} as never,
    };
    const session = buildRunCompleteSession(base, "game_over", {});

    expect(session.combatState).toBeUndefined();
  });

  it("provides demo run stats when the session has none", () => {
    const base = SessionManagement.createInitialSession("p1", "seed-1");
    delete (base as { runStats?: unknown }).runStats;
    const session = buildRunCompleteSession(base, "game_over", {});

    expect(session.runStats?.damageDealt).toBe(123456);
    expect(session.runStats?.mostPowerfulUnit?.cardId).toBe("mana_crystal");
  });
});
