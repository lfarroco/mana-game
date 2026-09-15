/**
 * Interactive tutorial sandbox — the pure rules behind slides 3–8.
 *
 * The tutorial's "simulation sandbox" lets the player cast a real ability at a
 * demo crystal and watch the numbers move. To keep the lesson honest, the rules
 * here mirror the observable behaviour of the combat engine exactly:
 *
 *   - damage is absorbed by shield first, the remainder hits life
 *     (`Entities/Force.applyDamageToForce`);
 *   - poison *pierces* shield and additionally builds a per-second rate
 *     (`Combat/PoisonDamageSystem`);
 *   - heal restores life (capped at max) and removes `floor(heal * 0.05)`
 *     poison — 20 heal per 1 poison, the number the slide text quotes;
 *   - regen builds a per-second heal rate; one `tick()` applies one second.
 *
 * Pure module: no Phaser, no DOM, no randomness (the sandbox is deterministic
 * on purpose — a tutorial must never show a different number twice).
 */

import { none, some, type Option } from "../Functional";

/**
 * Every ability family the sandbox understands. Deliberately a superset of the
 * FX kinds so the advanced-abilities slide can annotate state without an
 * instant number. Runtime list so authored slide content can be validated
 * against it (see `tutorialSlides.test.ts`).
 */
export const SANDBOX_ABILITY_KINDS = [
  "damage",
  "shield",
  "heal",
  "regen",
  "poison",
  "haste",
  "slow",
  "charge",
  "increase_power",
  "increase_critical",
] as const;

export type SandboxAbilityKind = (typeof SANDBOX_ABILITY_KINDS)[number];

/** The pop-text colour/icon family a sandbox event plays back as. */
export type SandboxPopKind = "damage" | "shield" | "heal" | "poison";

/**
 * One ability on the sandbox palette. `power` is the authored magnitude; the
 * ability's own `kind` decides how it is applied.
 *
 * `intervalMs` is the per-second status rate for poison/regen: the engine
 * applies `power` once per second while the status is up.
 */
export interface SandboxAbility {
  readonly id: string;
  readonly kind: SandboxAbilityKind;
  readonly power: number;
  /** BBCode chip colour key (see `data/abilityColors`). */
  readonly color: string;
  /** Seconds between status ticks (poison/regen only); defaults to 1000. */
  readonly intervalMs?: number;
  /** Show this ability's chip as a "buff" the first time it is used. */
  readonly toggle?: boolean;
}

/** The mutable-by-return values the sandbox panel displays. */
export interface SandboxState {
  readonly life: number;
  readonly maxLife: number;
  readonly shield: number;
  readonly poison: number;
  readonly regen: number;
  /** Damage that cleared the shield pool this cast (for the "absorbed" pop). */
  readonly powerBonus: number;
  readonly critChance: number;
  /** 1 = normal cooldown speed, 0.5 = haste, 2 = slow. */
  readonly cooldownMultiplier: number;
}

export const createSandboxState = (spec: {
  life: number;
  maxLife?: number;
  shield?: number;
  poison?: number;
  regen?: number;
}): SandboxState => ({
  life: Math.max(0, Math.min(spec.maxLife ?? spec.life, spec.life)),
  maxLife: spec.maxLife ?? spec.life,
  shield: spec.shield ?? 0,
  poison: spec.poison ?? 0,
  regen: spec.regen ?? 0,
  powerBonus: 0,
  critChance: 0,
  cooldownMultiplier: 1,
});

/** One floating number to play over the target after a sandbox event. */
export interface SandboxPop {
  readonly text: string;
  readonly kind: SandboxPopKind;
  /** Delay before the pop plays, in ms (status ticks line up with the FX). */
  readonly delayMs: number;
}

/**
 * The result of applying one ability: the next state, the immediate FX to
 * play, and the numbers to show. Everything the render layer needs, so the
 * panel never re-derives a rule.
 */
export interface SandboxOutcome {
  readonly state: SandboxState;
  /** FX family to play between the caster and the target, if any. */
  readonly fx: Option<SandboxAbilityKind>;
  /** Floating numbers to show over the target, in order. */
  readonly pops: readonly SandboxPop[];
  /** Status rate to schedule from now on (poison/regen), if any. */
  readonly tickRate: Option<{
    kind: "poison" | "regen";
    amount: number;
    intervalMs: number;
  }>;
}

const STATUS_TICK_MS = 1000;

const round = (n: number): number => Math.round(n);

/**
 * Damage through shield. Returns the post-hit state plus the split so the panel
 * can explain "shield absorbed 35, life lost 10".
 */
const applyDamage = (
  state: SandboxState,
  damage: number,
): { state: SandboxState; absorbed: number; lifeLost: number } => {
  const absorbed = Math.min(damage, state.shield);
  const lifeLost = Math.min(damage - absorbed, state.life);
  return {
    state: {
      ...state,
      shield: state.shield - absorbed,
      life: state.life - lifeLost,
    },
    absorbed,
    lifeLost,
  };
};

/**
 * Heal, capped at max life, with the engine's poison reduction
 * (`floor(heal * 0.05)`, i.e. 20 heal removes 1 poison).
 */
const applyHeal = (
  state: SandboxState,
  amount: number,
): {
  state: SandboxState;
  healed: number;
  poisonRemoved: number;
  overHeal: boolean;
} => {
  const before = state.life;
  const life = Math.min(state.maxLife, state.life + amount);
  const healed = life - before;
  const poisonRemoved =
    amount < 20 ? 0 : Math.min(state.poison, Math.floor(amount * 0.05));
  return {
    state: { ...state, life, poison: state.poison - poisonRemoved },
    healed,
    poisonRemoved,
    overHeal: before + amount > state.maxLife,
  };
};

/**
 * Apply one palette ability to the sandbox state.
 *
 * Deterministic — no crit roll: `increase_critical` only annotates
 * `critChance`, and damage always lands at its authored power. A tutorial that
 * rolls dice teaches the wrong lesson.
 */
export const castInSandbox = (
  state: SandboxState,
  ability: SandboxAbility,
): SandboxOutcome => {
  switch (ability.kind) {
    case "damage": {
      const damage = ability.power + state.powerBonus;
      const { state: next, absorbed, lifeLost } = applyDamage(state, damage);
      const pops: SandboxPop[] = [];
      if (absorbed > 0) {
        pops.push({ text: `-${round(absorbed)}`, kind: "shield", delayMs: 0 });
      }
      if (lifeLost > 0) {
        pops.push({
          text: `-${round(lifeLost)}`,
          kind: "damage",
          delayMs: absorbed > 0 ? 220 : 0,
        });
      }
      return { state: next, fx: some("damage"), pops, tickRate: none };
    }

    case "poison": {
      // Poison pierces shield outright (Force.applyDamageToForce: damageType "poison").
      const lifeLost = Math.min(ability.power, state.life);
      return {
        state: {
          ...state,
          life: state.life - lifeLost,
          poison: state.poison + ability.power,
        },
        fx: some("poison"),
        pops: [{ text: `-${round(lifeLost)}`, kind: "poison", delayMs: 0 }],
        tickRate: some({
          kind: "poison",
          amount: ability.power,
          intervalMs: ability.intervalMs ?? STATUS_TICK_MS,
        }),
      };
    }

    case "shield":
      return {
        state: { ...state, shield: state.shield + ability.power },
        fx: some("shield"),
        pops: [
          { text: `+${round(ability.power)}`, kind: "shield", delayMs: 0 },
        ],
        tickRate: none,
      };

    case "heal": {
      const {
        state: next,
        healed,
        poisonRemoved,
        overHeal,
      } = applyHeal(state, ability.power);
      const pops: SandboxPop[] = [
        { text: `+${round(healed)}`, kind: "heal", delayMs: 0 },
      ];
      if (poisonRemoved > 0) {
        pops.push({ text: `-${poisonRemoved}☠`, kind: "poison", delayMs: 260 });
      }
      if (overHeal) {
        pops.push({ text: "MAX", kind: "heal", delayMs: 420 });
      }
      return { state: next, fx: some("heal"), pops, tickRate: none };
    }

    case "regen":
      return {
        state: { ...state, regen: state.regen + ability.power },
        fx: some("regen"),
        pops: [],
        tickRate: some({
          kind: "regen",
          amount: ability.power,
          intervalMs: ability.intervalMs ?? STATUS_TICK_MS,
        }),
      };

    case "haste":
      return {
        state: { ...state, cooldownMultiplier: 0.5 },
        fx: none,
        pops: [],
        tickRate: none,
      };

    case "slow":
      return {
        state: { ...state, cooldownMultiplier: 2 },
        fx: none,
        pops: [],
        tickRate: none,
      };

    case "charge":
      return { state, fx: none, pops: [], tickRate: none };

    case "increase_power":
      return {
        state: { ...state, powerBonus: state.powerBonus + ability.power },
        fx: none,
        pops: [],
        tickRate: none,
      };

    case "increase_critical":
      return {
        state: {
          ...state,
          critChance: Math.min(1, state.critChance + ability.power / 100),
        },
        fx: none,
        pops: [],
        tickRate: none,
      };
  }
};

/**
 * Advance one second of a status rate (poison damages through shield, regen
 * heals). Returns the new state and the pop the panel should play.
 */
export const tickStatus = (
  state: SandboxState,
  kind: "poison" | "regen",
  amount: number,
): { state: SandboxState; pop: SandboxPop } => {
  if (kind === "poison") {
    const lifeLost = Math.min(amount, state.life);
    return {
      state: { ...state, life: state.life - lifeLost },
      pop: { text: `-${round(lifeLost)}`, kind: "poison", delayMs: 0 },
    };
  }

  const before = state.life;
  const life = Math.min(state.maxLife, state.life + amount);
  return {
    state: { ...state, life },
    pop: { text: `+${round(life - before)}`, kind: "heal", delayMs: 0 },
  };
};

/** True when the demo crystal has been destroyed (used to stop status ticks). */
export const isSandboxDefeated = (state: SandboxState): boolean =>
  state.life <= 0;

/** Look an ability up on a palette. */
export const findSandboxAbility = (
  palette: readonly SandboxAbility[],
  id: string,
): Option<SandboxAbility> => {
  const ability = palette.find((a) => a.id === id);
  return ability ? some(ability) : none;
};

/**
 * How much of `damage` the current shield can absorb — the "shield math" the
 * damage slide shows as a live readout.
 */
export const previewAbsorption = (
  state: SandboxState,
  damage: number,
): { absorbed: number; lifeLost: number } => {
  const absorbed = Math.min(damage, state.shield);
  return { absorbed, lifeLost: Math.max(0, damage - absorbed) };
};
