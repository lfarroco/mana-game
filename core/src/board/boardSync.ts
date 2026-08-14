import type { Unit } from "../Models";

export type RenderedUnitState = {
  id: string;
  power: number;
  rank: number;
};

export type BoardSyncPlan = {
  /** Chara ids to destroy (no longer in the team). */
  toDestroy: string[];
  /** Team units with no rendered chara yet (summon them). */
  toSummon: Unit[];
  /** Team units whose rendered chara has stale power/rank (refresh in place). */
  toRefresh: Unit[];
};

/** Compute the destroy/summon/refresh diff between the team and rendered charas. */
export function planBoardSync(teamUnits: Unit[], rendered: RenderedUnitState[]): BoardSyncPlan {
  const teamIds = new Set(teamUnits.map((u) => u.id));
  const renderedById = new Map(rendered.map((u) => [u.id, u]));

  const toDestroy = rendered.filter((u) => !teamIds.has(u.id)).map((u) => u.id);
  const toSummon: Unit[] = [];
  const toRefresh: Unit[] = [];

  for (const unit of teamUnits) {
    const existing = renderedById.get(unit.id);
    if (!existing) {
      toSummon.push(unit);
    } else if (existing.power !== unit.power || existing.rank !== unit.rank) {
      toRefresh.push(unit);
    }
  }

  return { toDestroy, toSummon, toRefresh };
}
