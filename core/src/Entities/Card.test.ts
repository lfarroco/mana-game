/// <reference types="jest" />

import { jest } from "@jest/globals";
import * as Card from "./Card";
import * as Models from "../Models";

describe("Card", () => {
  describe("setCardsMap / resetCardsMap", () => {
    afterEach(() => {
      Card.resetCardsMap();
    });

    it("hasCardDefinition returns false for unknown cards by default", () => {
      expect(Card.hasCardDefinition("nonexistent")).toBe(false);
    });

    it("getCardDefinition returns dummy for unknown cards by default", () => {
      const def = Card.getCardDefinition("nonexistent");
      expect(def.id).toBe("dummy_card");
    });

    it("setCardsMap makes custom cards available", () => {
      const cards = new Map([
        [
          "test-card",
          {
            id: "test-card",
            pic: "x",
            cooldown: 1000,
            effects: [],
            reactions: [],
          } as Models.CardDefinition,
        ],
      ]);
      Card.setCardsMap(cards);
      expect(Card.hasCardDefinition("test-card")).toBe(true);
      expect(Card.getCardDefinition("test-card").id).toBe("test-card");
    });

    it("getCores filters by isCore", () => {
      const cards = new Map([
        [
          "core1",
          {
            id: "core1",
            pic: "x",
            cooldown: 1000,
            isCore: true,
            effects: [],
            reactions: [],
          } as Models.CardDefinition,
        ],
        [
          "unit1",
          {
            id: "unit1",
            pic: "y",
            cooldown: 800,
            isCore: false,
            effects: [],
            reactions: [],
          } as Models.CardDefinition,
        ],
      ]);
      Card.setCardsMap(cards);
      expect(Card.getCores()).toHaveLength(1);
      expect(Card.getCores()[0].id).toBe("core1");
      expect(Card.getNonCores()).toHaveLength(1);
      expect(Card.getNonCores()[0].id).toBe("unit1");
    });

    it("getAvailableCards filters non-core unlocked cards", () => {
      const cards = new Map([
        [
          "core1",
          {
            id: "core1",
            pic: "x",
            cooldown: 1000,
            isCore: true,
            effects: [],
            reactions: [],
          } as Models.CardDefinition,
        ],
        [
          "locked1",
          {
            id: "locked1",
            pic: "y",
            cooldown: 800,
            locked: true,
            effects: [],
            reactions: [],
          } as Models.CardDefinition,
        ],
        [
          "unlocked1",
          {
            id: "unlocked1",
            pic: "z",
            cooldown: 900,
            effects: [],
            reactions: [],
          } as Models.CardDefinition,
        ],
      ]);
      Card.setCardsMap(cards);
      const available = Card.getAvailableCards(["locked1"]);
      expect(available.map((c) => c.id).sort()).toEqual([
        "locked1",
        "unlocked1",
      ]);
    });

    it("resetCardsMap restores defaults and clears custom cards", () => {
      const cards = new Map([
        [
          "card1",
          {
            id: "card1",
            pic: "x",
            cooldown: 1000,
            effects: [],
            reactions: [],
          } as Models.CardDefinition,
        ],
      ]);
      Card.setCardsMap(cards);
      expect(Card.hasCardDefinition("card1")).toBe(true);
      Card.resetCardsMap();
      expect(Card.hasCardDefinition("card1")).toBe(false);
    });
  });

  describe("createUnitFromCardSpec", () => {
    it("creates unit with proper defaults", () => {
      const cardDef: Models.CardDefinition = {
        id: "test-card",
        pic: "test-pic",
        power: 30,
        cooldown: 2000,
        rank: 2,
        life: 150,
        critical: 5,
        effects: [{ id: "damage" }],
        reactions: [],
      };
      const unit = Card.createUnitFromCardSpec(
        "PLAYER",
        cardDef,
        [1, 2],
        "unit-id-1",
      );
      expect(unit.id).toBe("unit-id-1");
      expect(unit.cardId).toBe("test-card");
      expect(unit.force).toBe("PLAYER");
      expect(unit.position).toEqual([1, 2]);
      expect(unit.power).toBe(30);
      expect(unit.cooldown).toBe(2000);
      expect(unit.rank).toBe(2);
      expect(unit.life).toBe(150);
      expect(unit.maxLife).toBe(150);
      expect(unit.critical).toBe(5);
      expect(unit.isCore).toBe(false);
      expect(unit.shield).toBe(0);
      expect(unit.charge).toBe(0);
      expect(unit.refresh).toBe(0);
      expect(unit.hasted).toBe(0);
      expect(unit.slowed).toBe(0);
      expect(unit.bonusPower).toBe(0);
    });

    it("marks isCore when card definition has it", () => {
      const cardDef: Models.CardDefinition = {
        id: "core-card",
        pic: "core-pic",
        cooldown: 5000,
        isCore: true,
        effects: [],
        reactions: [],
      };
      const unit = Card.createUnitFromCardSpec(
        "CPU",
        cardDef,
        [0, 0],
        "core-id",
      );
      expect(unit.isCore).toBe(true);
    });

    it("deep clones effects and reactions", () => {
      const cardDef: Models.CardDefinition = {
        id: "clone-test",
        pic: "test",
        cooldown: 1000,
        effects: [{ id: "damage" }],
        reactions: [],
      };
      const unit = Card.createUnitFromCardSpec("PLAYER", cardDef, [0, 0], "id");
      expect(unit.effects).toEqual([{ id: "damage" }]);
      expect(unit.effects).not.toBe(cardDef.effects);
    });
  });

  describe("validateCardDefinition", () => {
    const makeCard = (
      reactions: Models.EffectReaction[],
    ): Models.CardDefinition => ({
      id: "reaction-card",
      pic: "x",
      cooldown: 1000,
      effects: [],
      reactions,
    });

    it("flags position 'self' with a non-global effectId (can never fire)", () => {
      const card = makeCard([
        { position: "self", effectId: "damage", effects: [{ id: "heal" }] },
      ]);
      const issues = Card.validateCardDefinition(card);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain("reaction-card");
      expect(issues[0]).toContain("damage");
    });

    it("flags position 'self' with effectId 'all' (basic abilities are non-global)", () => {
      const card = makeCard([
        { position: "self", effectId: "all", effects: [{ id: "heal" }] },
      ]);
      expect(Card.validateCardDefinition(card)).toHaveLength(1);
    });

    it("accepts position 'self' with global reaction ids", () => {
      const card = makeCard([
        { position: "self", effectId: "on_crit", effects: [{ id: "heal" }] },
        {
          position: "self",
          effectId: "on_battle_start",
          effects: [{ id: "heal" }],
        },
        {
          position: "self",
          effectId: "every_100_damage",
          effects: [{ id: "heal" }],
        },
      ]);
      expect(Card.validateCardDefinition(card)).toEqual([]);
    });

    it("accepts non-self positions with non-global effectIds", () => {
      const card = makeCard([
        { position: "allies", effectId: "damage", effects: [{ id: "heal" }] },
        { position: "enemies", effectId: "shield", effects: [{ id: "heal" }] },
      ]);
      expect(Card.validateCardDefinition(card)).toEqual([]);
    });

    it("setCardsMap accepts invalid cards without runtime warning (validation is at module load)", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const cards = new Map([
          [
            "reaction-card",
            makeCard([
              {
                position: "self",
                effectId: "damage",
                effects: [{ id: "heal" }],
              },
            ]),
          ],
        ]);
        Card.setCardsMap(cards);
        expect(Card.hasCardDefinition("reaction-card")).toBe(true);
        // No warning expected — validation runs on the static ALL_CARDS at module load
        // Test-specific cards are assumed valid by the test author
      } finally {
        warn.mockRestore();
      }
    });

    it("setCardsMap with valid reactions works silently", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const cards = new Map([
          [
            "ok-card",
            makeCard([
              {
                position: "allies",
                effectId: "damage",
                effects: [{ id: "heal" }],
              },
            ]),
          ],
        ]);
        Card.setCardsMap(cards);
        expect(Card.hasCardDefinition("ok-card")).toBe(true);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });
});
