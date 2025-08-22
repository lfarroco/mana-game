import { Unit } from "../../../Models/Entities/Unit";
import * as Chara from "../../../Systems/Chara/Chara";

// Registry is now owned by Chara; this module delegates to Chara for queries

export function clearCharas() { Chara.clearAll(); }

export function destroyChara(id: string) { Chara.destroy(Chara.getCharaById(id)); }
export async function summonChara(unit: Unit, useSummonEffect = true) { return Chara.summon(unit, useSummonEffect); }

// registerChara removed: Chara.create() handles registration.

// positioning now provided by Chara.getCharaPosition

export function getChara(id: string) { return Chara.getCharaById(id); }

export function getAllCharas() { return Chara.getAllCharas(); }

export const getSurroundingAllies = (unit: Unit) => Chara.getSurroundingAllies(unit);

export function handleSummonCharaToBoardEvent(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void { Chara.summonToBoard(payload); }
export function handleCharaChargeBarUpdateEvent(payload: { unitId: string }): void { Chara.updateChargeBarById(payload); }
export function handleCharaBarsVisibilitySetEvent(payload: { unitId: string, visible: boolean }): void { Chara.setBarsVisibilityById(payload); }