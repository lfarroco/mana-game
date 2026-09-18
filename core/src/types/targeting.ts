/**
 * Targeting type — discriminated union describing who or what an effect targets.
 */

export type Targeting =
  | { id: "self" }
  | { id: "random_ally"; count: number }
  | { id: "random_enemy"; count: number }
  | { id: "row_allies" }
  | { id: "column_allies" }
  | {
      id: "all_allies";
      ofType: "any" | "damage" | "heal" | "shield" | "poison" | "regen";
    }
  | { id: "all_enemies" }
  | { id: "strongest_enemy" }
  | { id: "weakest_enemy" }
  /**
   * The opposing force's crystal, regardless of power. Distinct from
   * `strongest_enemy`: enemy teams are generated with high-power units and a
   * core that only receives a flat share of the round's power points, so the
   * enemy core is almost never the enemy's strongest unit. The Void Crystal's
   * baseline sap targets the enemy CRYSTAL, which is the mirror-symmetric
   * choice (docs/unit-balance.md §10).
   */
  | { id: "enemy_core" }
  | { id: "strongest_ally" }
  | { id: "weakest_ally" }
  | { id: "top_ally" }
  | { id: "bottom_ally" }
  | { id: "left_ally" }
  | { id: "right_ally" }
  | { id: "trigger" };
