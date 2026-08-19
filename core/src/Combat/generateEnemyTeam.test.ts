/// <reference types="jest" />

import { generateEnemyTeam } from "./generateEnemyTeam";
import * as Card from "../Entities/Card";
import { CardDefinition } from "../Models";
import { FORCE_ID_CPU } from "../Constants";

const mockCards: CardDefinition[] = [
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
  {
    id: "silver_1",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 2,
  },
  {
    id: "gold_1",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 3,
  },
];

function registerTestCards(): void {
  Card.setCardsMap(new Map(mockCards.map((c) => [c.id, c] as const)));
}

describe("generateEnemyTeam", () => {
  beforeEach(() => {
    registerTestCards();
  });

  it("returns units with CPU force", () => {
    const units = generateEnemyTeam("seed1", 0, 1, mockCards);
    expect(units.length).toBeGreaterThan(0);
    for (const u of units) {
      expect(u.force).toBe(FORCE_ID_CPU);
    }
  });

  it("has exactly one core unit", () => {
    const units = generateEnemyTeam("seed2", 0, 1, mockCards);
    const cores = units.filter((u) => u.isCore);
    expect(cores).toHaveLength(1);
  });

  it("is deterministic — same inputs produce same team", () => {
    const a = generateEnemyTeam("mana", 3, 5, mockCards);
    const b = generateEnemyTeam("mana", 3, 5, mockCards);
    expect(a.map((u) => u.cardId)).toEqual(b.map((u) => u.cardId));
    expect(a.map((u) => u.position)).toEqual(b.map((u) => u.position));
  });

  it("different seeds produce different teams", () => {
    const a = generateEnemyTeam("seedA", 0, 3, mockCards);
    const b = generateEnemyTeam("seedB", 0, 3, mockCards);
    const aFingerprint = a
      .map((u) => `${u.cardId}@${u.position}`)
      .sort()
      .join(",");
    const bFingerprint = b
      .map((u) => `${u.cardId}@${u.position}`)
      .sort()
      .join(",");
    expect(aFingerprint).not.toBe(bFingerprint);
  });

  it("scales units with round", () => {
    const round1 = generateEnemyTeam("s", 0, 1, mockCards);
    const round3 = generateEnemyTeam("s", 0, 3, mockCards);
    expect(round3.length).toBeGreaterThan(round1.length);
  });

  it("core life scales with round", () => {
    const r1 = generateEnemyTeam("s", 0, 1, mockCards);
    const r5 = generateEnemyTeam("s", 0, 5, mockCards);
    const core1 = r1.find((u) => u.isCore)!;
    const core5 = r5.find((u) => u.isCore)!;
    expect(core5.life).toBeGreaterThan(core1.life);
  });

  it("scales the core life by 150 per round past round 1 (CUB-D1)", () => {
    // CUB-D1 raised the per-round core life bump from 100 to 150 per round
    // (compensating the simplified action-only cores). Life is the win/loss
    // condition, so the enemy core must stay threatening as the player's core
    // grows through max-life upgrades.
    const r1 = generateEnemyTeam("l1", 0, 1, mockCards);
    const r5 = generateEnemyTeam("l5", 0, 5, mockCards);
    const r10 = generateEnemyTeam("l10", 0, 10, mockCards);
    const core1 = r1.find((u) => u.isCore)!;
    const core5 = r5.find((u) => u.isCore)!;
    const core10 = r10.find((u) => u.isCore)!;
    expect(core1.life).toBe(500);
    expect(core1.maxLife).toBe(500);
    expect(core5.life).toBe(1100); // 500 + 150 × 4
    expect(core5.maxLife).toBe(1100);
    expect(core10.life).toBe(1850); // 500 + 150 × 9
    expect(core10.maxLife).toBe(1850);
  });

  it("distributes the round-scaled power budget (round × 20) to every unit (CUB-D1)", () => {
    // CUB-D1 doubled the power budget (round * 10 → round * 20). Mock cards
    // carry power 0, so each unit's power is exactly
    // floor(round × 20 / unitCount) — no rank-up or base-power noise.
    const round1 = generateEnemyTeam("p1", 0, 1, mockCards); // 4 units
    for (const u of round1) {
      expect(u.power).toBe(5); // floor(20 / 4)
    }
    const round3 = generateEnemyTeam("p3", 0, 3, mockCards); // 9 units
    for (const u of round3) {
      expect(u.power).toBe(6); // floor(60 / 9)
    }
    const round5 = generateEnemyTeam("p5", 0, 5, mockCards); // 9 units
    for (const u of round5) {
      expect(u.power).toBe(11); // floor(100 / 9)
    }
  });

  it("caps at MAX_UNITS (9)", () => {
    const units = generateEnemyTeam("big", 0, 10, mockCards);
    expect(units.length).toBeLessThanOrEqual(9);
  });

  it("all units have unique positions", () => {
    const units = generateEnemyTeam("pos", 0, 5, mockCards);
    const positionKeys = units.map((u) => `${u.position[0]},${u.position[1]}`);
    expect(new Set(positionKeys).size).toBe(units.length);
  });

  it("throws for negative round", () => {
    expect(() => generateEnemyTeam("err", 0, -1, mockCards)).toThrow(
      "Round must be a non-negative number",
    );
  });

  it("throws for empty pool", () => {
    expect(() => generateEnemyTeam("err", 0, 1, [])).toThrow(
      "Card pool cannot be empty",
    );
  });

  it("applies post-win-10 power scaling", () => {
    const normal = generateEnemyTeam("scale", 5, 12, mockCards);
    const scaled = generateEnemyTeam("scale", 10, 12, mockCards);
    const normalCore = normal.find((u) => u.isCore)!;
    const scaledCore = scaled.find((u) => u.isCore)!;
    expect(scaledCore.life).toBeGreaterThan(normalCore.life);
  });
});
