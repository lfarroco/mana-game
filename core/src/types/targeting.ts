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
  | { id: "strongest_ally" }
  | { id: "weakest_ally" }
  | { id: "top_ally" }
  | { id: "bottom_ally" }
  | { id: "left_ally" }
  | { id: "right_ally" }
  | { id: "trigger" };
