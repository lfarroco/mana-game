/// <reference types="jest" />

import * as EnemyGeneration from "./EnemyGeneration";
import * as Card from "../Entities/Card";
import { FORCE_ID_CPU } from "../math/Constants";

const mockCards = [
  {
    id: "core_a",
    pic: "",
    cooldown: 3000,
    effects: [],
    reactions: [],
    isCore: true,
    life: 500,
  },
  {
    id: "core_b",
    pic: "",
    cooldown: 3000,
    effects: [],
    reactions: [],
    isCore: true,
    life: 500,
  },
  {
    id: "unit_1",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_2",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_3",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_4",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_5",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_6",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_7",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_8",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
  {
    id: "unit_9",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 1,
  },
];

function registerTestCards(): void {
  Card.setCardsMap(new Map(mockCards.map((c) => [c.id, c] as const)));
}

describe("EnemyGeneration", () => {
  beforeEach(() => {
    registerTestCards();
  });

  describe("generateEnemyTeamForRound", () => {
    it("returns an array of units", () => {
      const units = EnemyGeneration.generateEnemyTeamForRound(1, 0, "seed");
      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBeGreaterThan(0);
    });

    it("all units have CPU force", () => {
      const units = EnemyGeneration.generateEnemyTeamForRound(3, 2, "s2");
      for (const u of units) {
        expect(u.force).toBe(FORCE_ID_CPU);
      }
    });

    it("is deterministic", () => {
      const a = EnemyGeneration.generateEnemyTeamForRound(5, 3, "mana");
      const b = EnemyGeneration.generateEnemyTeamForRound(5, 3, "mana");
      expect(a.map((u) => u.cardId)).toEqual(b.map((u) => u.cardId));
    });

    it("team size grows with round", () => {
      const r1 = EnemyGeneration.generateEnemyTeamForRound(1, 0, "s");
      const r3 = EnemyGeneration.generateEnemyTeamForRound(3, 0, "s");
      expect(r3.length).toBeGreaterThan(r1.length);
    });
  });
});
