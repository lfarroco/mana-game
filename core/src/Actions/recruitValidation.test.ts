/// <reference types="jest" />

import { checkRecruitEligibility } from "./recruitValidation";
import * as SessionManagement from "../session/SessionManagement";
import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import type { Unit } from "../Models";

const TEAM_CARD_IDS = [
  "void_witch",
  "living_armor",
  "thunder_mech",
  "timebender",
  "tek_monk",
  "void_specter",
  "plaguebearer",
  "toxic_alchemist",
  "venomous_viper",
];

const NEW_CARD_ID = "moss_golem";

function makeTeamUnit(
  cardId: string,
  position: [number, number],
  overrides: Partial<Unit> = {},
): Unit {
  return { ...Card.makeUnit(Constants.FORCE_ID_PLAYER, cardId, position), ...overrides };
}

function makeSession(units: Unit[]) {
  const session = SessionManagement.createInitialSession("p1", "seed-1");
  session.team.units = units;
  return session;
}

describe("checkRecruitEligibility", () => {
  it("allows a new card on an empty team without a target slot", () => {
    const session = makeSession([]);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, null)).toEqual({
      ok: true,
      wasUpgrade: false,
    });
  });

  it("rejects a new card when the party is full", () => {
    const session = makeSession(
      TEAM_CARD_IDS.map((cardId, index) =>
        makeTeamUnit(cardId, [index % 3, Math.floor(index / 3)]),
      ),
    );
    expect(session.team.units).toHaveLength(9);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, null)).toEqual({
      ok: false,
      reason: "PARTY_FULL",
    });
  });

  it("allows a new card when the party has a free slot", () => {
    const session = makeSession(
      TEAM_CARD_IDS.slice(0, 8).map((cardId, index) =>
        makeTeamUnit(cardId, [index % 3, Math.floor(index / 3)]),
      ),
    );
    expect(session.team.units).toHaveLength(8);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, null)).toEqual({
      ok: true,
      wasUpgrade: false,
    });
  });

  it("upgrades in place (ignoring party size) when the card exists at rank 3", () => {
    const units = TEAM_CARD_IDS.slice(0, 8).map((cardId, index) =>
      makeTeamUnit(cardId, [index % 3, Math.floor(index / 3)]),
    );
    units.push(makeTeamUnit(NEW_CARD_ID, [2, 2], { rank: 3 }));
    const session = makeSession(units);
    expect(session.team.units).toHaveLength(9);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, null)).toEqual({
      ok: true,
      wasUpgrade: true,
    });
  });

  it("rejects a full party when the card exists at rank 4 (cannot upgrade)", () => {
    const units = TEAM_CARD_IDS.slice(0, 8).map((cardId, index) =>
      makeTeamUnit(cardId, [index % 3, Math.floor(index / 3)]),
    );
    units.push(makeTeamUnit(NEW_CARD_ID, [2, 2], { rank: 4 }));
    const session = makeSession(units);
    expect(session.team.units).toHaveLength(9);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, null)).toEqual({
      ok: false,
      reason: "PARTY_FULL",
    });
  });

  it("rejects a new card when the target slot is occupied", () => {
    const session = makeSession([makeTeamUnit("void_witch", [0, 0])]);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, [0, 0])).toEqual({
      ok: false,
      reason: "SLOT_OCCUPIED",
    });
  });

  it("allows a new card when the target slot is empty", () => {
    const session = makeSession([makeTeamUnit("void_witch", [0, 0])]);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, [2, 2])).toEqual({
      ok: true,
      wasUpgrade: false,
    });
  });

  it("ignores an occupied target slot when the purchase is an upgrade", () => {
    const session = makeSession([
      makeTeamUnit(NEW_CARD_ID, [0, 0], { rank: 1 }),
      makeTeamUnit("void_witch", [1, 1]),
    ]);
    expect(checkRecruitEligibility(session, NEW_CARD_ID, [1, 1])).toEqual({
      ok: true,
      wasUpgrade: true,
    });
  });
});
