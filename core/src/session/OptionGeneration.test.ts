/// <reference types="jest" />

import * as OptionGeneration from "./OptionGeneration";
import * as Models from "../Models";
import * as Card from "../Entities/Card";

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
    id: "damage_1",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "damage" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "damage_2",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "damage" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "damage_3",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "damage" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "heal_1",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "heal" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "heal_2",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "heal" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "heal_3",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "heal" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "shield_1",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "shield" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "shield_2",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "shield" } as Models.Effect],
    reactions: [],
    rank: 1,
  },
  {
    id: "shield_3",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "shield" } as Models.Effect],
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
    id: "silver_2",
    pic: "",
    cooldown: 1000,
    effects: [],
    reactions: [],
    rank: 2,
  },
  {
    id: "silver_damage",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "damage" } as Models.Effect],
    reactions: [],
    rank: 2,
  },
  {
    id: "silver_heal",
    pic: "",
    cooldown: 1000,
    effects: [{ id: "heal" } as Models.Effect],
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

function makeSession(
  overrides: Partial<Models.SessionData> = {},
): Models.SessionData {
  return {
    id: "test",
    player_id: "p1",
    session_type: { type: "singleplayer" },
    phase: "encounter",
    round: 1,
    step: 1,
    seed: "test-seed",
    initial_seed: "test-seed",
    options: [],
    team: { units: [] },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
    ...overrides,
  };
}

function registerTestCards(): void {
  Card.setCardsMap(new Map(mockCards.map((c) => [c.id, c] as const)));
}

describe("OptionGeneration", () => {
  beforeEach(() => {
    registerTestCards();
  });

  describe("createEncounterOptions", () => {
    it("returns 3 options", () => {
      const session = makeSession();
      const { options } = OptionGeneration.createEncounterOptions(session);
      expect(options).toHaveLength(3);
      for (const opt of options) {
        expect(typeof opt.id).toBe("string");
      }
    });

    it("is deterministic for same seed", () => {
      const a = OptionGeneration.createEncounterOptions(
        makeSession({ seed: "fixed" }),
      );
      const b = OptionGeneration.createEncounterOptions(
        makeSession({ seed: "fixed" }),
      );
      expect(a.options.map((o) => o.id)).toEqual(b.options.map((o) => o.id));
    });

    it("different seeds produce different options (usually)", () => {
      const a = OptionGeneration.createEncounterOptions(
        makeSession({ seed: "alpha" }),
      );
      const b = OptionGeneration.createEncounterOptions(
        makeSession({ seed: "beta" }),
      );
      const idsA = a.options
        .map((o) => o.id)
        .sort()
        .join(",");
      const idsB = b.options
        .map((o) => o.id)
        .sort()
        .join(",");
      expect(idsA).not.toBe(idsB);
    });

    it("returns encounter history alongside options", () => {
      const session = makeSession();
      expect(session.encounter_history).toEqual([]);
      const { encounterHistory } =
        OptionGeneration.createEncounterOptions(session);
      expect(encounterHistory.length).toBeGreaterThanOrEqual(3);
      // Session must not be mutated
      expect(session.encounter_history).toEqual([]);
    });

    it("avoids recently shown encounters", () => {
      const session = makeSession();
      // First call to get some options that will populate history
      const firstCall = OptionGeneration.createEncounterOptions(session);
      // History now has 3 items (but session is not mutated since we use the new return value)
      const secondCall = OptionGeneration.createEncounterOptions({
        ...session,
        encounter_history: firstCall.encounterHistory,
      });
      // The second call cannot pick from the recently-shown 3
      const firstIds = new Set(firstCall.options.map((o) => o.id));
      for (const opt of secondCall.options) {
        expect(firstIds.has(opt.id)).toBe(false);
      }
    });
  });

  describe("generateShopOptions", () => {
    it("returns 3 options for standard encounters", () => {
      const session = makeSession({ phase: "encounter" });
      const action: Models.Action = {
        type: "select_encounter",
        encounterId: "armory",
      };
      const options = OptionGeneration.generateShopOptions(session, action);
      expect(options).toHaveLength(3);
    });

    it("returns 1 option for gold shop", () => {
      const session = makeSession({ phase: "encounter" });
      const action: Models.Action = {
        type: "select_encounter",
        encounterId: "gold_shop",
      };
      const options = OptionGeneration.generateShopOptions(session, action);
      expect(options).toHaveLength(1);
    });

    it("returns 2 options for silver shop", () => {
      const session = makeSession({ phase: "encounter" });
      const action: Models.Action = {
        type: "select_encounter",
        encounterId: "silver_shop",
      };
      const options = OptionGeneration.generateShopOptions(session, action);
      expect(options).toHaveLength(2);
    });

    it("throws for non-select_encounter action", () => {
      const session = makeSession();
      const action: Models.Action = { type: "skip" };
      expect(() =>
        OptionGeneration.generateShopOptions(session, action),
      ).toThrow();
    });

    it("filters out max-rank cards", () => {
      const session = makeSession({
        phase: "encounter",
        team: {
          units: [
            {
              id: "u1",
              cardId: "damage_1",
              pic: "",
              force: "PLAYER",
              position: [0, 0],
              rank: 4,
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
              silenced: 0,
              isCore: false,
            },
          ],
        },
      });
      const action: Models.Action = {
        type: "select_encounter",
        encounterId: "armory",
      };
      const options = OptionGeneration.generateShopOptions(session, action);
      for (const opt of options) {
        expect(opt.id).not.toBe("damage_1");
      }
    });

    it("deterministic for same seed", () => {
      const session = makeSession({ seed: "shop-det" });
      const action: Models.Action = {
        type: "select_encounter",
        encounterId: "armory",
      };
      const a = OptionGeneration.generateShopOptions(session, action);
      const b = OptionGeneration.generateShopOptions(
        makeSession({ seed: "shop-det" }),
        action,
      );
      expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
    });

    it("keeps effect shops bronze-only before round 4 (A15)", () => {
      for (const round of [1, 2, 3]) {
        const session = makeSession({ phase: "encounter", round });
        const action: Models.Action = {
          type: "select_encounter",
          encounterId: "armory",
        };
        const options = OptionGeneration.generateShopOptions(session, action);
        expect(options).toHaveLength(3);
        for (const opt of options) {
          const card = mockCards.find((c) => c.id === opt.id) as
            Models.CardDefinition | undefined;
          expect(card!.rank ?? 1).toBe(1);
        }
      }
    });

    it("admits silvers into effect shops from round 4 on (A15)", () => {
      const seenSilver = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const session = makeSession({
          phase: "encounter",
          round: 4,
          seed: `a15-${i}`,
        });
        const action: Models.Action = {
          type: "select_encounter",
          encounterId: "armory",
        };
        const options = OptionGeneration.generateShopOptions(session, action);
        expect(options).toHaveLength(3);
        for (const opt of options) {
          const card = mockCards.find((c) => c.id === opt.id) as
            Models.CardDefinition | undefined;
          expect(card!.rank ?? 1).toBeLessThanOrEqual(2);
          // Every offered card actually performs the shop's effect.
          expect(
            card!.effects?.some((e) => e.id === "damage") ||
              card!.reactions?.some((r) =>
                r.effects?.some((e) => e.id === "damage"),
              ),
          ).toBe(true);
          if ((card!.rank ?? 1) === 2) seenSilver.add(card!.id);
        }
      }
      // Silvers are in the damage pool and must surface across seeds.
      expect(seenSilver.has("silver_damage")).toBe(true);
    });

    it("keeps tier shops rank-locked regardless of round (A15)", () => {
      // silver_shop / gold_shop are unaffected by the round-4 silver opener.
      const silverOptions = OptionGeneration.generateShopOptions(
        makeSession({ phase: "encounter", round: 4 }),
        { type: "select_encounter", encounterId: "silver_shop" },
      );
      for (const opt of silverOptions) {
        const card = mockCards.find((c) => c.id === opt.id) as
          Models.CardDefinition | undefined;
        expect(card!.rank ?? 1).toBe(2);
      }

      const goldOptions = OptionGeneration.generateShopOptions(
        makeSession({ phase: "encounter", round: 6 }),
        { type: "select_encounter", encounterId: "gold_shop" },
      );
      for (const opt of goldOptions) {
        const card = mockCards.find((c) => c.id === opt.id) as
          Models.CardDefinition | undefined;
        expect(card!.rank ?? 1).toBe(3);
      }
    });
  });
});
