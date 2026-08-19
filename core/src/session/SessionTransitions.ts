/**
 * Session State Transitions
 *
 * Handles advancing a session through game phases and managing turn progression.
 * Orchestrates action resolution, seed advancement, and phase transitions.
 */

import * as Models from "../Models";
import * as SessionManagement from "./SessionManagement";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as EnemyGeneration from "./EnemyGeneration";
import * as PhaseConfig from "../PhaseSystem/PhaseConfig";
import * as RecruitmentActions from "../Actions/RecruitmentActions";
import * as OrbAndCoreUpgrades from "../Actions/OrbAndCoreUpgrades";
import * as OptionGeneration from "./OptionGeneration";
import { WINS_TO_WIN_GAME, LOSSES_TO_GAME_OVER } from "../math/Constants";
import * as Random from "../math/Random";
import { CARDS_BY_ID } from "../data/BaseCollection";
import {
  CORE_STAT_ORBS,
  CORE_UPGRADE_DEFINITIONS,
  getThemeUpgradePool,
} from "../content/coreUpgradeOrbs";
import type {
  CoreUpgradeDefinition,
  CoreUpgradeOrbId,
} from "../content/coreUpgradeOrbs";

const ORB_SHOP_ENCOUNTER_OPTIONS: Record<string, Models.PhaseOption[]> = {
  upgrade_unit: [{ id: "upgrade_orb" }],
  power_distributor: [{ id: "distribute_power_orb" }],
  power_absorber: [{ id: "absorb_power_orb" }],
  dark_ritual: [{ id: "sacrifice_unit_orb" }],
  scrap_salvage: [{ id: "scrap_salvage_orb" }],
  gamblers_shrine: [{ id: "sacrifice_effect_orb" }],
};

const UPGRADE_CORE_OPTIONS: Models.PhaseOption[] = [
  { id: "increase_core_max_life" },
  { id: "upgrade_core_power" },
  { id: "decrease_core_cooldown" },
];

const ADD_REACTION_CORE_OPTIONS: Models.PhaseOption[] = [
  { id: "on_100_damage_effect" },
  { id: "on_crit_effect" },
  { id: "on_battle_start_effect" },
];

function transitionAfterCombat(
  session: Models.SessionData,
): Models.SessionData {
  if (!session.combatState) {
    throw new Error("Missing combat state for end_combat transition");
  }

  const { wonCombat } = session.combatState;
  delete session.combatState;

  if (wonCombat) session.wins += 1;
  else session.losses += 1;

  if (session.wins >= WINS_TO_WIN_GAME) {
    return {
      ...session,
      phase: "victory",
      options: [{ id: "victory" }],
    };
  }

  if (session.losses >= LOSSES_TO_GAME_OVER) {
    return {
      ...session,
      phase: "game_over",
      options: [],
    };
  }

  const nextStep = session.step + 1;
  const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

  if (expectedPhase === "upgrade_core") {
    return {
      ...session,
      phase: "upgrade_core",
      options: UPGRADE_CORE_OPTIONS,
      step: nextStep,
    };
  }

  if (expectedPhase === "add_reaction_core") {
    return {
      ...session,
      phase: "add_reaction_core",
      options: ADD_REACTION_CORE_OPTIONS,
      step: nextStep,
    };
  }

  const { options: encounterOptions, encounterHistory } =
    OptionGeneration.createEncounterOptions(session);

  return {
    ...session,
    phase: "encounter",
    options: encounterOptions,
    encounter_history: encounterHistory,
    step: 0,
    round: session.round + 1,
  };
}

function transitionAfterVictory(
  session: Models.SessionData,
): Models.SessionData {
  const nextStep = session.step + 1;
  const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

  if (expectedPhase === "upgrade_core") {
    return {
      ...session,
      phase: "upgrade_core",
      options: UPGRADE_CORE_OPTIONS,
      step: session.step + 1,
    };
  }

  if (expectedPhase === "add_reaction_core") {
    return {
      ...session,
      phase: "add_reaction_core",
      options: ADD_REACTION_CORE_OPTIONS,
      step: session.step + 1,
    };
  }

  return session;
}

const ACTION_HANDLERS: Record<
  string,
  (session: Models.SessionData, action: Models.Action) => Models.SessionData
> = {
  select_encounter: (session, action) => {
    if (action.type !== "select_encounter") throw new Error();

    if (action.encounterId === "start_combat")
      return executeCombatPhase(session);

    if (action.encounterId === "rest_inn") {
      if (session.losses > 0) session.losses -= 1;
      return transitionToNextStep(session);
    }

    if (action.encounterId === "soul_trade") {
      if (session.losses + 1 >= LOSSES_TO_GAME_OVER) return session;
      session.losses += 1;
    }

    // Core-upgrade options (CUB-B3): the upgrade_core / add_reaction_core
    // phases offer stat ids and themed identity-orb ids, and the client
    // dispatches them via select_encounter. Apply the orb to the core and
    // advance the run.
    if (isCoreUpgradeOptionId(action.encounterId)) {
      const core = session.team.units.find((u) => u.isCore);
      if (core) {
        OrbAndCoreUpgrades.applyCoreUpgrade(
          core,
          action.encounterId,
          session.round,
        );
      }
      return transitionToNextStep(session);
    }

    const orbOptions = ORB_SHOP_ENCOUNTER_OPTIONS[action.encounterId];
    if (orbOptions) {
      return {
        ...session,
        phase: "orb_shop",
        options: orbOptions,
      };
    }

    return {
      ...session,
      phase: "shop",
      options: OptionGeneration.generateShopOptions(session, action),
    };
  },
  end_combat: transitionAfterCombat,
  // Recruit or upgrade a unit by card ID
  // Pass a session variant that uses the deep-copied team so recruitUnit mutates our copy.
  recruit_unit: (session, action) => {
    if (action.type !== "recruit_unit") throw new Error();
    const updatedSession = RecruitmentActions.recruitUnit(
      session,
      action.unitId,
      action.targetSlot,
    );

    return transitionToNextStep(updatedSession);
  },
  update_team: (session, action) => {
    if (action.type !== "update_team") throw new Error();

    return SessionManagement.updateTeamAction(session, action.team.units);
  },
  start_combat: (session, action) => {
    if (action.type !== "start_combat") throw new Error();

    return executeCombatPhase(session);
  },
  decrease_core_cooldown: (session) => {
    const {
      team: { units },
    } = session;
    const core = units.find((u) => u.isCore);

    if (!core) {
      console.warn(
        "SessionTransitions",
        "No core found in team when applying cooldown decrease",
      );
      return session;
    }

    OrbAndCoreUpgrades.decreaseCoreCooldown(core);
    return session;
  },
  upgrade_core_power: (session) => {
    const {
      team: { units },
    } = session;
    const core = units.find((u) => u.isCore);

    if (!core) {
      console.warn(
        "SessionTransitions",
        "No core found in team when applying power increase",
      );
      return session;
    }

    OrbAndCoreUpgrades.upgradeCorePower(core, session.round);
    return session;
  },
  increase_core_max_life: (session) => {
    const {
      team: { units },
    } = session;
    const core = units.find((u) => u.isCore);

    if (!core) {
      console.warn(
        "SessionTransitions",
        "No core found in team when applying life increase",
      );
      return session;
    }

    OrbAndCoreUpgrades.upgradeCoreMaxLife(core, session.round);
    return session;
  },
  // Meta actions: team mutation with no phase change.
  discard_unit: (session, action) => {
    if (action.type !== "discard_unit") throw new Error();

    RecruitmentActions.discardUnit(session.team.units, action.unitId as string);
    return session;
  },

  apply_orb: (session, action) => {
    if (action.type !== "apply_orb") throw new Error();

    const { orbId, targetUnitId } = action;
    session.seed = OrbAndCoreUpgrades.applyOrb(
      session.team.units,
      targetUnitId,
      orbId,
      { seed: session.seed },
    );
    return transitionToNextStep(session);
  },
  upgrade_unit: (session) => ({
    ...session,
    phase: "orb_shop",
    options: [{ id: "upgrade_orb" }],
  }),
  power_distributor: (session) => ({
    ...session,
    phase: "orb_shop",
    options: [{ id: "distribute_power_orb" }],
  }),
  power_absorber: (session) => ({
    ...session,
    phase: "orb_shop",
    options: [{ id: "absorb_power_orb" }],
  }),
  skip: (session) => {
    const allowedSkipPhases: Models.PhaseType[] = [
      "encounter",
      "shop",
      "orb_shop",
      "upgrade_core",
      "add_reaction_core",
    ];

    if (!allowedSkipPhases.includes(session.phase)) {
      console.warn(
        "SessionTransitions",
        `Received skip action in phase '${session.phase}', which is not allowed. Ignoring action.`,
      );
      return session;
    }

    return transitionToNextStep(session);
  },
  victory: transitionAfterVictory,
};

function transitionToNextStep(session: Models.SessionData): Models.SessionData {
  let nextPhase = PhaseConfig.getPhaseForTurn(
    session.round,
    session.step + 1,
  );

  // End of the round's phase rotation: roll over to round + 1 at step 0
  // (every rotation starts with "encounter").
  if (!nextPhase) {
    session.round += 1;
    session.step = 0;
    nextPhase = PhaseConfig.getPhaseForTurn(session.round, session.step);
  } else {
    session.step = session.step + 1;
  }

  if (nextPhase === "encounter") {
    const { options: encounterOptions, encounterHistory } =
      OptionGeneration.createEncounterOptions(session);
    session.options = encounterOptions;
    session.encounter_history = encounterHistory;
    session.phase = nextPhase;
    return session;
  }

  if (nextPhase === "pre_combat") {
    session.options = [{ id: "start_combat" }];
    session.phase = nextPhase;
    return session;
  }

  return {
    ...session,
    step: session.step,
    phase: nextPhase,
    options: [],
  };
}

export function transitionToNextState(
  session: Models.SessionData,
  action: Models.Action,
  options?: { enemyTeam?: Models.Unit[]; enemyPlayerName?: string },
): Models.ActionResponse {
  console.debug(
    "SessionTransitions",
    "Transitioning session with action:",
    action,
  );

  const nextSession = structuredClone(session);

  // Multiplayer: start_combat with an opponent's team injected from matchmaking.
  // Bypass the generic ACTION_HANDLERS for this path so we can thread the override.
  if (action.type === "start_combat" && options?.enemyTeam) {
    const resultSession = executeCombatPhase(
      nextSession,
      options.enemyTeam,
      options.enemyPlayerName,
    );
    const combatState = resultSession.combatState;
    if (resultSession.phase === "combat" && combatState) {
      return { session: resultSession, combatState };
    }
    return { session: resultSession };
  }

  const actionHandler = ACTION_HANDLERS[action.type];

  if (!actionHandler)
    throw new Error(
      `No transition handler for phase '${nextSession.phase}' and action '${action.type}'`,
    );

  const resultSession = actionHandler(nextSession, action);

  // If a combat was just executed (start_combat), carry the combatState in the response
  // The combatState is embedded in the session by executeCombatPhase so it survives restarts.
  const combatState = resultSession.combatState;
  if (resultSession.phase === "combat" && combatState) {
    return { session: resultSession, combatState };
  }

  return { session: resultSession };
}

function executeCombatPhase(
  session: Models.SessionData,
  enemyTeam?: Models.Unit[],
  enemyPlayerName?: string,
): Models.SessionData {
  console.debug(
    "SessionTransitions",
    "Entering combat encounter phase. Executing combat...",
    session,
  );

  // Single-player: generate enemy team from seed.
  // Multiplayer: pass the opponent's team via the enemyTeam parameter.
  const team =
    enemyTeam ??
    EnemyGeneration.generateEnemyTeamForRound(
      session.round,
      session.wins,
      session.seed,
    );

  const combatState: Models.CombatState = CombatSimulation.createCombatState(
    session,
    team,
    enemyPlayerName,
  );

  const finalCombatState = CombatSimulation.simulateCombat(
    session,
    combatState,
  );

  const nextSession: Models.SessionData = {
    ...session,
    // Combat is the rotation's index-4 phase (see PhaseConfig); advance the
    // step so the post-combat transition resolves upgrade_core /
    // add_reaction_core (index 5) instead of re-reading "combat".
    step: session.step + 1,
    phase: "combat",
    combatState: finalCombatState,
    options: [
      {
        id: "end_combat",
      },
    ],
  };

  console.debug(
    "SessionTransitions",
    "Combat phase completed. Session after combat:",
    nextSession,
  );

  return nextSession;
}

function isCore(unit: Models.Unit): boolean {
  return unit.isCore;
}

/** True for core-upgrade option ids: the generic stat ids or a themed identity orb. */
function isCoreUpgradeOptionId(id: string): boolean {
  return (
    (CORE_STAT_ORBS as readonly string[]).includes(id) ||
    id in CORE_UPGRADE_DEFINITIONS
  );
}

/**
 * True when the identity orb's effect/reaction is already present on the core
 * — deep-equality (JSON.stringify) against the core's effects/reactions arrays.
 * Used to dedupe already-applied identity orbs out of upgrade options.
 */
function hasIdentityOrbApplied(
  core: Models.Unit,
  orb: CoreUpgradeDefinition,
): boolean {
  if (orb.kind === "effect" && orb.effect) {
    return core.effects.some(
      (effect) => JSON.stringify(effect) === JSON.stringify(orb.effect),
    );
  }
  if (orb.kind === "reaction" && orb.reaction) {
    return core.reactions.some(
      (reaction) => JSON.stringify(reaction) === JSON.stringify(orb.reaction),
    );
  }
  return false;
}

/**
 * Round gate for a core-upgrade orb — eligible when it has no `minRound` or the
 * run has reached that round (mirrors encounter minRound).
 */
export function isOrbEligibleForRound(
  orb: CoreUpgradeDefinition,
  round: number,
): boolean {
  return orb.minRound === undefined || round >= orb.minRound;
}

/**
 * Generate the three core-upgrade options offered to the player (CUB-B1).
 *
 * Theme-scoped: options come from the player core card's theme pool (its four
 * identity orbs plus the three generic stat orbs). Seeded deterministic: the
 * same session seed + round always yields the same three options. Dedupes
 * identity orbs already applied to the core (deep-equality), while stat orbs
 * stay repeatable. Honors each orb's `minRound` gate. Falls back to exactly the
 * three generic stat orbs when the session has no core or the core card has no
 * theme.
 */
export function generateCoreUpgradeOptions(
  session: Models.SessionData,
): Models.PhaseOption[] {
  const core = session.team.units.find(isCore);
  const theme = core ? CARDS_BY_ID.get(core.cardId)?.coreTheme : undefined;

  if (!theme || !core) {
    return CORE_STAT_ORBS.map((id) => ({ id }));
  }

  const pool = getThemeUpgradePool(theme);
  const eligible = pool.filter((orb) =>
    isOrbEligibleForRound(orb, session.round),
  );
  const available = eligible.filter(
    (orb) => orb.kind === "stat" || !hasIdentityOrbApplied(core, orb),
  );

  const seedNum = Random.stringToSeed(
    `${session.seed}:core-upgrade:${session.round}`,
  );
  const shuffled = Random.shuffleWithSeed(available, seedNum);
  return shuffled.slice(0, 3).map((orb) => ({
    id: orb.id as CoreUpgradeOrbId,
  }));
}
