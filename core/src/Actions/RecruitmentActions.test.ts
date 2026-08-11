/// <reference types="jest" />

import * as RecruitmentActions from "./RecruitmentActions";
import * as Models from "../Models";
import * as Card from "../Entities/Card";
import { FORCE_ID_PLAYER } from "../Constants";

const mockCards: Models.CardDefinition[] = [
  {
    id: "unit_a",
    pic: "",
    cooldown: 1000,
    power: 10,
    effects: [
      {
        id: "increase_power",
        amount: 2,
        permanent: false,
        targets: { id: "self" },
      },
    ],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_b",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_c",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
];

function makeUnit(
  id: string,
  cardId: string,
  pos: [number, number],
  overrides: Partial<Models.Unit> = {},
): Models.Unit {
  return {
    id,
    cardId,
    pic: "",
    force: FORCE_ID_PLAYER,
    position: pos,
    rank: 1,
    power: 10,
    bonusPower: 0,
    life: 100,
    maxLife: 100,
    shield: 0,
    cooldown: 1000,
    evade: 0,
    effects: [],
    reactions: [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    isCore: false,
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<Models.SessionData> = {},
): Models.SessionData {
  return {
    id: "test",
    player_id: "p1",
    session_type: { type: "singleplayer" },
    phase: "shop",
    round: 1,
    step: 1,
    seed: "test-seed",
    initial_seed: "test-seed",
    options: [{ id: "unit_a", cost: 10, recruitRank: 1 }],
    team: { units: [] },
    wins: 0,
    losses: 0,
    action_log: [],
    ...overrides,
  };
}

function registerTestCards(): void {
  Card.setCardsMap(new Map(mockCards.map((c) => [c.id, c] as const)));
}

describe("RecruitmentActions", () => {
  beforeEach(() => {
    registerTestCards();
  });

  describe("recruitUnit", () => {
    it("adds a new unit to the team", () => {
      const session = makeSession();
      const result = RecruitmentActions.recruitUnit(session, "unit_a", null);
      expect(result.team.units).toHaveLength(1);
      expect(result.team.units[0].cardId).toBe("unit_a");
    });

    it("upgrades existing unit instead of adding duplicate", () => {
      const existing = makeUnit("existing", "unit_a", [0, 0], {
        rank: 1,
        power: 10,
        maxLife: 100,
        life: 80,
      });
      const session = makeSession({ team: { units: [existing] } });
      const result = RecruitmentActions.recruitUnit(session, "unit_a", null);
      expect(result.team.units).toHaveLength(1);
      expect(result.team.units[0].rank).toBe(2);
      // Unified linear model: power = base 10 × (2 − 1 + 1) = 20,
      // maxLife grows 1.5× per rank, and effect amounts scale by rank.
      expect(result.team.units[0].power).toBe(20);
      expect(result.team.units[0].maxLife).toBe(150);
      expect(result.team.units[0].life).toBe(150);
      expect((result.team.units[0].effects[0] as { amount: number }).amount).toBe(
        4,
      );
    });

    it("places unit at target slot when provided", () => {
      const session = makeSession();
      const result = RecruitmentActions.recruitUnit(session, "unit_a", [2, 2]);
      expect(result.team.units[0].position).toEqual([2, 2]);
    });

    it("rejects out-of-bounds position", () => {
      const session = makeSession();
      const result = RecruitmentActions.recruitUnit(session, "unit_a", [5, 5]);
      expect(result.team.units).toHaveLength(0); // unchanged
    });

    it("rejects already-occupied position", () => {
      const existing = makeUnit("existing", "unit_b", [1, 1]);
      const session = makeSession({ team: { units: [existing] } });
      const result = RecruitmentActions.recruitUnit(session, "unit_a", [1, 1]);
      expect(result.team.units).toHaveLength(1); // still just the existing unit
      expect(result.team.units[0].cardId).toBe("unit_b");
    });

    it("returns original session for unknown card", () => {
      const session = makeSession();
      const result = RecruitmentActions.recruitUnit(
        session,
        "nonexistent_card",
        null,
      );
      expect(result).toBe(session);
    });

    it("does not upgrade rank-4 unit", () => {
      const existing = makeUnit("existing", "unit_a", [0, 0], { rank: 4 });
      const session = makeSession({ team: { units: [existing] } });
      const result = RecruitmentActions.recruitUnit(session, "unit_a", null);
      expect(result.team.units[0].rank).toBe(4);
    });
  });

  describe("discardUnit", () => {
    it("removes a non-core unit", () => {
      const units = [makeUnit("u1", "unit_a", [0, 0])];
      const result = RecruitmentActions.discardUnit(units, "u1");
      expect(result.updated).toBe(true);
      expect(units).toHaveLength(0);
    });

    it("does not remove a core unit", () => {
      const core = makeUnit("core", "unit_a", [0, 0], { isCore: true });
      const units = [core];
      const result = RecruitmentActions.discardUnit(units, "core");
      expect(result.updated).toBe(false);
      expect(units).toHaveLength(1);
    });

    it("returns not updated for non-existent unit", () => {
      const result = RecruitmentActions.discardUnit([], "nonexistent");
      expect(result.updated).toBe(false);
    });
  });
});
