import * as Models from "../Models";
import { MAX_PARTY_SIZE } from "../math/Constants";
import type { Vec2 } from "../math/Geometry";
import * as geom from "../math/Geometry";

export type RecruitCheckResult =
  | { ok: true; wasUpgrade: boolean }
  | { ok: false; reason: "PARTY_FULL" | "SLOT_OCCUPIED" };

/**
 * Client-side pre-validation mirroring the server's recruit rules, so the shop
 * can reject a purchase before dispatching. A unit with the same cardId and
 * rank < 4 upgrades in place (does not consume a party slot); otherwise the
 * purchase needs a free slot. `wasUpgrade` is true whenever a unit with the
 * same cardId already exists on the team.
 */
export function checkRecruitEligibility(
  session: Models.SessionData,
  cardId: string,
  targetSlot: Vec2 | null,
): RecruitCheckResult {
  const units = session.team.units;
  const existingUnit = units.find((u) => u.cardId === cardId);
  const upgradesInPlace = Boolean(existingUnit && existingUnit.rank < 4);

  if (!upgradesInPlace && units.length >= MAX_PARTY_SIZE) {
    return { ok: false, reason: "PARTY_FULL" };
  }

  if (targetSlot && !upgradesInPlace) {
    const occupier = units.find((u) => geom.eqVec2(u.position, targetSlot));
    if (occupier) return { ok: false, reason: "SLOT_OCCUPIED" };
  }

  return { ok: true, wasUpgrade: Boolean(existingUnit) };
}
