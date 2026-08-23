/// <reference types="jest" />

import * as OptionGeneration from "./OptionGeneration";
import * as SessionTransitions from "./SessionTransitions";
import * as Card from "../Entities/Card";
import * as Models from "../Models";

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

function cardDef(input: {
  id: string;
  rank?: number;
  effects?: { id: string }[];
  reactions?: {
    effectId: string;
    effects: { id: string }[];
    position: string;
  }[];
  cooldown: number;
  isCore?: boolean;
  life?: number;
}): Models.CardDefinition {
  return {
    id: input.id,
    pic: "",
    cooldown: input.cooldown ?? 1000,
    effects: (input.effects ?? []) as Models.Effect[],
    reactions: (input.reactions ?? []) as Models.EffectReaction[],
    ...(input.isCore ? { isCore: true } : {}),
    ...(input.rank !== undefined ? { rank: input.rank } : {}),
    ...(input.life !== undefined ? { life: input.life } : {}),
  };
}

function registerTestCards(): void {
  Card.setCardsMap(
    new Map(
      [
        cardDef({
          id: "dmg_bronze",
          rank: 1,
          cooldown: 1000,
          effects: [{ id: "damage" }],
        }),
        cardDef({
          id: "shd_bronze",
          rank: 1,
          cooldown: 1000,
          effects: [{ id: "shield" }],
        }),
        cardDef({
          id: "silver_react_damage",
          rank: 2,
          cooldown: 1000,
          reactions: [
            {
              effectId: "damage",
              effects: [{ id: "increase_power" }],
              position: "enemies",
            },
          ],
        }),
        cardDef({
          id: "silver_react_shield",
          rank: 2,
          cooldown: 1000,
          reactions: [
            {
              effectId: "shield",
              effects: [{ id: "increase_power" }],
              position: "allies",
            },
          ],
        }),
        cardDef({
          id: "silver_react_heal",
          rank: 2,
          cooldown: 1000,
          reactions: [
            {
              effectId: "heal",
              effects: [{ id: "increase_power" }],
              position: "allies",
            },
          ],
        }),
        cardDef({
          id: "silver_react_haste",
          rank: 2,
          cooldown: 1000,
          reactions: [
            {
              effectId: "haste",
              effects: [{ id: "increase_power" }],
              position: "allies",
            },
          ],
        }),
        cardDef({
          id: "gold_damage",
          rank: 3,
          cooldown: 1000,
          effects: [{ id: "damage" }],
        }),
        cardDef({
          id: "core_crystal",
          cooldown: 1000,
          isCore: true,
          life: 500,
        }),
      ].map((c) => [c.id, c] as const),
    ),
  );
}

describe("New P1 encounters", () => {
  beforeEach(() => {
    registerTestCards();
  });

  afterEach(() => {
    Card.resetCardsMap();
  });

  describe("runesmith reaction-trigger shops", () => {
    it("returns only silvers that react to damage for runesmith_damage", () => {
      const options = OptionGeneration.generateShopOptions(makeSession(), {
        type: "select_encounter",
        encounterId: "runesmith_damage",
      });
      expect(options.length).toBeGreaterThan(0);
      expect(options.length).toBeLessThanOrEqual(2);
      for (const opt of options) {
        const card = Card.getNonCores().find((c) => c.id === opt.id);
        expect(card!.rank).toBe(2);
        expect(card!.reactions?.some((r) => r.effectId === "damage")).toBe(
          true,
        );
      }
    });

    it("returns only silvers that react to shields for runesmith_shield", () => {
      const options = OptionGeneration.generateShopOptions(makeSession(), {
        type: "select_encounter",
        encounterId: "runesmith_shield",
      });
      expect(options.length).toBeGreaterThan(0);
      expect(options.length).toBeLessThanOrEqual(2);
      for (const opt of options) {
        const card = Card.getNonCores().find((c) => c.id === opt.id);
        expect(card!.rank).toBe(2);
        expect(card!.reactions?.some((r) => r.effectId === "shield")).toBe(
          true,
        );
      }
    });

    it("returns only silvers that react to healing for runesmith_heal", () => {
      const options = OptionGeneration.generateShopOptions(makeSession(), {
        type: "select_encounter",
        encounterId: "runesmith_heal",
      });
      expect(options.length).toBeGreaterThan(0);
      expect(options.length).toBeLessThanOrEqual(2);
      for (const opt of options) {
        const card = Card.getNonCores().find((c) => c.id === opt.id);
        expect(card!.rank).toBe(2);
        expect(card!.reactions?.some((r) => r.effectId === "heal")).toBe(true);
      }
    });

    it("never returns bronze, gold, or off-trigger silvers", () => {
      for (const encounterId of [
        "runesmith_damage",
        "runesmith_shield",
        "runesmith_heal",
      ]) {
        const options = OptionGeneration.generateShopOptions(makeSession(), {
          type: "select_encounter",
          encounterId,
        });
        for (const opt of options) {
          const card = Card.getNonCores().find((c) => c.id === opt.id);
          expect(card!.rank).toBe(2);
          expect(card!.id).not.toBe("silver_react_haste");
        }
      }
    });
  });

  describe("soul_trade routing", () => {
    it("loses a life and routes to a 1-option gold shop", () => {
      const result = SessionTransitions.transitionToNextState(
        makeSession({ losses: 1 }),
        {
          type: "select_encounter",
          encounterId: "soul_trade",
        },
      );
      expect(result.session.losses).toBe(2);
      expect(result.session.phase).toBe("shop");
      expect(result.session.options).toHaveLength(1);
      const card = Card.getNonCores().find(
        (c) => c.id === result.session.options[0].id,
      );
      expect(card!.rank).toBe(3);
    });

    it("rejects soul_trade when it would cost the last life", () => {
      const result = SessionTransitions.transitionToNextState(
        makeSession({ losses: 3 }),
        {
          type: "select_encounter",
          encounterId: "soul_trade",
        },
      );
      expect(result.session.losses).toBe(3);
      expect(result.session.phase).toBe("encounter");
    });
  });

  describe("rest_inn life restore", () => {
    it("restores one life and advances without a shop", () => {
      const result = SessionTransitions.transitionToNextState(
        makeSession({ losses: 2 }),
        {
          type: "select_encounter",
          encounterId: "rest_inn",
        },
      );
      expect(result.session.losses).toBe(1);
      expect(result.session.phase).not.toBe("shop");
      expect(result.session.phase).not.toBe("orb_shop");
    });

    it("does not restore below zero losses", () => {
      const result = SessionTransitions.transitionToNextState(
        makeSession({ losses: 0 }),
        {
          type: "select_encounter",
          encounterId: "rest_inn",
        },
      );
      expect(result.session.losses).toBe(0);
    });
  });

  describe("orb wildcard routing", () => {
    it("dark_ritual routes to orb_shop with sacrifice_unit_orb", () => {
      const result = SessionTransitions.transitionToNextState(makeSession(), {
        type: "select_encounter",
        encounterId: "dark_ritual",
      });
      expect(result.session.phase).toBe("orb_shop");
      expect(result.session.options.map((o) => o.id)).toEqual([
        "sacrifice_unit_orb",
      ]);
    });

    it("gamblers_shrine routes to orb_shop with sacrifice_effect_orb", () => {
      const result = SessionTransitions.transitionToNextState(makeSession(), {
        type: "select_encounter",
        encounterId: "gamblers_shrine",
      });
      expect(result.session.phase).toBe("orb_shop");
      expect(result.session.options.map((o) => o.id)).toEqual([
        "sacrifice_effect_orb",
      ]);
    });

    it("scrap_salvage routes to orb_shop with scrap_salvage_orb", () => {
      const result = SessionTransitions.transitionToNextState(makeSession(), {
        type: "select_encounter",
        encounterId: "scrap_salvage",
      });
      expect(result.session.phase).toBe("orb_shop");
      expect(result.session.options.map((o) => o.id)).toEqual([
        "scrap_salvage_orb",
      ]);
    });
  });

  describe("wacky encounter routing (Tier A)", () => {
    it("chaos_altar routes to orb_shop with the random-orb marker", () => {
      const result = SessionTransitions.transitionToNextState(makeSession(), {
        type: "select_encounter",
        encounterId: "chaos_altar",
      });
      expect(result.session.phase).toBe("orb_shop");
      expect(result.session.options.map((o) => o.id)).toEqual([
        "chaos_altar_random_orb",
      ]);
    });
  });

  describe("round firewall (minRound/maxRound enforcement)", () => {
    // Encounters whose minRound > 1 must never be offered in round 1.
    const ROUND_1_FORBIDDEN = new Set([
      "power_distributor",
      "power_absorber",
      "gold_shop",
      "gamblers_shrine",
      "dark_ritual",
      "scrap_salvage",
      "rest_inn",
      "soul_trade",
      "runesmith_damage",
      "runesmith_shield",
      "runesmith_heal",
      "oracles_riddle",
      "chaos_altar",
      "roulette_wheel",
    ]);

    it("never offers minRound-gated encounters in round 1", () => {
      for (const seed of ["a", "b", "c", "d", "e"]) {
        const { options } = OptionGeneration.createEncounterOptions(
          makeSession({ round: 1, seed }),
        );
        expect(options).toHaveLength(3);
        for (const opt of options) {
          expect(ROUND_1_FORBIDDEN.has(opt.id)).toBe(false);
        }
      }
    });

    it("offers minRound-gated encounters once their round arrives", () => {
      // Round 3 opens dark_ritual + runesmith shops; sweep many seeds so the
      // shuffle has a chance to surface them.
      const round3Seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const { options } = OptionGeneration.createEncounterOptions(
          makeSession({ round: 3, seed: `seed-${i}` }),
        );
        for (const opt of options) round3Seen.add(opt.id);
      }
      expect(round3Seen.has("dark_ritual")).toBe(true);
      expect(round3Seen.has("runesmith_damage")).toBe(true);
      expect(round3Seen.has("runesmith_heal")).toBe(true);
    });

    it("stops offering rest_inn after its maxRound window closes", () => {
      // rest_inn has maxRound 6 — it must never appear at round 7+.
      for (let i = 0; i < 50; i++) {
        const { options } = OptionGeneration.createEncounterOptions(
          makeSession({ round: 7, seed: `late-${i}` }),
        );
        for (const opt of options) {
          expect(opt.id).not.toBe("rest_inn");
        }
      }
    });
  });

  describe("session firewall (life-dependent encounters)", () => {
    it("never offers soul_trade or roulette_wheel at 1 life left", () => {
      // At losses 3 only one life remains — both encounters' transition
      // guards reject spending the last life, so they must not be offered.
      for (let i = 0; i < 50; i++) {
        const { options } = OptionGeneration.createEncounterOptions(
          makeSession({ round: 4, losses: 3, seed: `near-death-${i}` }),
        );
        for (const opt of options) {
          expect(opt.id).not.toBe("soul_trade");
          expect(opt.id).not.toBe("roulette_wheel");
        }
      }
    });

    it("offers soul_trade while the player can afford the life", () => {
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const { options } = OptionGeneration.createEncounterOptions(
          makeSession({ round: 4, losses: 1, seed: `soul-ok-${i}` }),
        );
        for (const opt of options) seen.add(opt.id);
      }
      expect(seen.has("soul_trade")).toBe(true);
    });

    it("never offers rest_inn at full lives", () => {
      for (let i = 0; i < 50; i++) {
        const { options } = OptionGeneration.createEncounterOptions(
          makeSession({ round: 3, losses: 0, seed: `full-lives-${i}` }),
        );
        for (const opt of options) {
          expect(opt.id).not.toBe("rest_inn");
        }
      }
    });

    it("offers rest_inn once a life has been lost", () => {
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const { options } = OptionGeneration.createEncounterOptions(
          makeSession({ round: 3, losses: 1, seed: `rest-ok-${i}` }),
        );
        for (const opt of options) seen.add(opt.id);
      }
      expect(seen.has("rest_inn")).toBe(true);
    });
  });
});
