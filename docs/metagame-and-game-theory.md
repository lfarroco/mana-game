# Metagame Dynamics and Game Theory

> **Design context:** this document is the companion to
> [abstract-balance-framework.md](abstract-balance-framework.md). The framework doc
> defines the profile layer — p(t), cumulative value C(t), crossings, dominance, and the
> window as a first-class balance parameter — for a single kit in a reference context.
> This document adds the population layer: what the distribution of players does about
> those profiles, whether the resulting metagame stays interesting, and what the designer
> controls. It assumes the notation of the framework doc and does not re-derive it.
>
> The ambition is the same as the framework doc: narrow, precise, and honest about what is
> theorem versus heuristic.

## 1. Thesis and Scope

**Thesis.** The profile layer answers "who beats whom, and when." The metagame layer
answers "what the population of players does about it, and whether the game stays
interesting." Balance analysis is incomplete without both: a game can be perfectly
balanced in profile terms (no strict dominance, all shapes viable) and still be stale,
because the _population_ can converge on one answer even when many exist.

Scope: the same class of games as the framework doc — autobattlers / automated combat
games with deterministic simulation, where strategies are kits or compositions and combat
outcomes are computable (in expectation) from the profile layer.

Three claims:

1. **Profiles generate payoff matrices.** From cumulative curves and a matchup outcome
   model, define M(W), the pairwise win-probability matrix. The metagame is the symmetric
   matrix game with payoff M(W).
2. **Metagame stability is a population phenomenon.** A stale metagame is a monomorphic
   attractor of the population dynamics; a healthy metagame is a stable polymorphic
   equilibrium or a cycle. Both are detectable from M(W).
3. **The window is a metagame dial.** Because M depends on W, the combat window — already
   a balance parameter in the framework doc — is also a _metagame stability_ parameter:
   it can be swept to move the population dynamics from convergent to diverse without
   touching a single card number.

**What this document is not.** A prescription for player psychology, a full theory of
equilibria in games with drafts, or a substitute for live metagame data. It is the
population-level layer on top of the profile layer, with formalizable claims separated
from design heuristics.

## 2. Setup: Strategies and the Payoff Matrix

### 2.1 Strategies and context

- **Strategy** — a kit, or a composition of kits, that a player can field.
- **Matchup** — two strategies i and j in a reference context (a fixed sink, a fixed
  window, per the framework doc §4).
- **Population** — a probability distribution x over strategies; x_i is the share of the
  population fielding strategy i.

### 2.2 The race form (matchup outcome model)

The framework doc defines dominance and verdicts on cumulative curves but does not define
_who wins a matchup_. The bridge:

> **Race form.** Against a common sink of life H, strategy i's kill time is
> T_i = min{ t : C_i(t) ≥ H }, where C_i is its cumulative delivery (framework doc §2.2).
> i beats j iff T_i < T_j.

Real outcomes include variance (critical hits, random targeting, seeds). Define:

> **Win probability.** P(i beats j | W, H) = P(T_i < T_j) over the seed distribution, with
> both curves truncated to the window W. If neither kills by W, the verdict is by total
> value V_W, or a draw, per the game's rules.

Two estimation routes, both legitimate:

- **Structural (cheap).** Derive T_i from solo profiles measured per the framework doc
  §4. This ignores interactions between the two fielded strategies — an approximation.
- **Empirical (ground truth).** Run full match simulations (both strategies fielded
  against each other) over a seed sweep, and measure win frequency directly.

The split mirrors the framework doc's "scalar for grading, profiles for structure": use
structural estimates for scanning and triage, empirical matrices for any conclusion that
matters.

### 2.3 The payoff matrix

> **Payoff matrix** M(W) with M_ij(W) = P(i beats j | W, H).

The metagame is the symmetric matrix game with payoff M(W): a player fielding strategy i
against a population x expects payoff (Mx)_i.

## 3. The Metagame

### 3.1 Rational play

Standard results, stated plainly:

- **Strict dominance.** If strategy t has a higher win probability than s against every
  possible opponent, s is strictly dominated and is never a best response: no rational
  player fields it. This is the game-theoretic justification for the framework doc's
  antichain criterion (§2.6) — a budget class with a strict dominator is degenerate not
  only aesthetically but strategically.
- **Nash equilibrium.** A population x\* is a Nash equilibrium if every strategy in its
  support is a best response to x\*. The metagame settles somewhere in the Nash set.

### 3.2 Replicator dynamics

The natural model of metagame evolution (with caveats in §8):

> **Replicator dynamics.** dx_i/dt = x_i · (f_i − f̄), where
> f_i = (Mx)_i is the fitness of strategy i against the current population and
> f̄ = x·Mx is the average fitness.

Interpretation: strategies that beat the average grow; strategies that lose to the average
shrink. The dynamics converge to Nash equilibria in some classes of games and cycle in
others; the stability classification is per-matrix and is _measured_, not assumed (§7 E8).

## 4. Metagame Stability and the Stale Metagame

### 4.1 Classifications

| Equilibrium type                         | Definition                                                                                                                                                    | Metagame symptom                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Monomorphic attractor**                | A single strategy s such that everyone playing s is a strict best response (a _pure strict Nash equilibrium_: M_ss > M_ts for all t ≠ s)                      | The stale metagame: one answer, everything else punished       |
| **Evolutionarily stable strategy (ESS)** | A (possibly mixed) strategy p that is a best response to itself and repels invaders — precisely: M_pp ≥ M_qp for all q, with M_pq > M_qq whenever M_pp = M_qp | A stable, invasion-proof answer; healthy only if not universal |
| **Polymorphic equilibrium**              | A mixed Nash equilibrium supported on several strategies                                                                                                      | Multiple viable archetypes coexist                             |
| **Limit cycle**                          | The replicator dynamics orbit rather than converge (rock-paper-scissors structure)                                                                            | The metagame never settles; meta-knowledge keeps paying        |

**Designer criterion.** M(W) should admit a stable polymorphic equilibrium or a limit
cycle, and no globally attracting pure strategy. The framework doc's antichain criterion
(no strict dominance) is the pairwise special case; the population-level statement is
strictly stronger — a strategy can be an attractor without strictly dominating anything,
because being the best answer to a population of itself is already enough.

### 4.2 Why cycles are good

A rock-paper-scissors structure (A beats B beats C beats A) has no pure Nash equilibrium;
the replicator dynamics cycle. No strategy permanently wins — but _knowledge of the
population_ is permanently rewarded: a player who reads that the majority is A can win
with B. The metagame becomes a learning loop that does not terminate. This is the formal
core of "rewarding game knowledge without a stale metagame" (§6 makes it concrete).

## 5. The Window as a Metagame Dial

M(W) depends on W through the truncation in the win-probability definition (§2.2) and
through the crossing structure of the profiles (framework doc §2.3). Two consequences:

1. **Matchup verdicts move with W.** Two strategies can trade verdicts as W crosses a
   cumulative crossing — already the framework doc's window-sensitivity result, now in
   matrix form: M(W₁) ≠ M(W₂) for W₁ ≠ W₂ in general.
2. **Metagame stability moves with W.** A population dynamics classification (convergent,
   cycling, polymorphic) performed at one W need not hold at another. The designer can
   therefore _sweep W_ and find windows at which the metagame is healthy.

**Claim.** The combat window is a continuous metagame-rebalancing parameter: changing it
shifts which temporal archetypes are viable and how the population dynamics behave, without
changing a single card number. Mana Battle's 30 s design window (and the timeout at 30 s,
`TIMEOUT_DAMAGE_START_TIME` in `core/src/math/Constants.ts`) is not just a combat
parameter — it is a metagame dial. The validation of this claim is E8.

## 6. Rewarding Game Knowledge Without a Stale Metagame _(heuristics)_

This section is design reasoning, not theorem. It is included because it serves the design
question that §4's formalism answers in the abstract.

### 6.1 Two kinds of knowledge

- **Catalog knowledge** — static: "X is the best." A lookup table. Finite, learnable, and
  then boring. Rewarded exactly once, by whoever solves the game first.
- **Conditional knowledge** — skill: "given _this_ shop, _this_ opponent, _this_ seed,
  which of the viable options is best _here_?" A decision procedure. Rewarded forever,
  because the answer changes with the revealed context.

**Staleness is what happens when decision points become unconditional** — when the best
response stops depending on context. §4 says this formally: an attractor strategy makes
the population's decision unconditional.

### 6.2 Skill-relevant variance

Variance should live in _what is revealed_ (shop offers, generated enemies, draft order),
so that the best response varies — while _outcome given a good response_ stays
low-variance. If revealed-context variance is absent, the game is solvable (catalog). If
outcome variance dominates, learning feels disconnected from payoff (pure luck). The
designer's target: the decision is hard, but a good decision reliably wins.

### 6.3 The levers

| Lever                           | Mechanic                                                                                     | Tied to                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- |
| Antichain (no strict dominance) | Keep every budget class free of strict dominators                                            | Framework doc §2.6                      |
| Anti-attractor design           | Ensure no pure strict NE in M(W): the "answer to the field" is never "the field itself"      | §4.1                                    |
| Engineered counter-cycles       | Cards that punish the current leader, gated by conditions so they do not dominate themselves | Reaction-gated cards, narrow triggers   |
| Conditional tech                | Punish _narrow_ strategies, so committing to one archetype carries a known counter           | Reaction-gated cards                    |
| Context randomness              | Shop subsets, generated enemies, seed variance — the best response varies                    | Mana Battle's shop and enemy generation |
| **Window dial**                 | Vary combat length by round/mode; shifts viable temporal archetypes                          | §5; framework doc §2.3                  |

In Mana Battle today (PVE), the "metagame" is the player's archetype choice against the
_generated_ content: the designer's levers are the shop economy and enemy generation, and
counter-cycles can be designed into the enemies directly (enemies that punish the previous
round's strongest archetype). When multiplayer arrives (server Phase 2), §4's population
formalism applies to the player population directly.

## 7. Validation Protocols

Status: **not yet executed**. Each protocol states hypothesis, method, and falsification
criterion, so execution is mechanical. They extend the framework doc's E1–E6.

### E7 — Measured payoff matrix and cycle detection

- **Hypothesis.** The pairwise verdict structure of a curated card pool contains cycles
  (A > B > C > A) rather than only chains.
- **Method.** Build M(W) empirically: full-match seed sweeps over the pool (framework doc
  §4.1 scenario extended to two fielded strategies). Then build the pairwise dominance
  graph from M(W) — an edge i → j iff M_ij(W) > 1/2 — and search for directed cycles.
- **Success.** At least one 3-cycle exists at some W. _If none: the pool is an ordering,
  not a game — report that, as it is itself the strongest possible staleness signal._

### E8 — Replicator dynamics classification (the window sweep)

- **Hypothesis.** The stability classification of M(W) changes with W: there is a pair of
  windows (W₁, W₂) for which the dynamics converge to a monomorphic attractor at W₁ but
  not at W₂.
- **Method.** Numerically integrate the replicator equation (§3.2) for M(W) at
  W ∈ {5, 10, 20, 30} s, from a spread of initial populations, and classify each window's
  long-run behavior (convergence to a pure strategy / to a mixed support / limit cycle).
- **Success.** The classification differs across the window sweep. _If identical: the
  window is not a metagame dial on this pool — report it._

### E9 — Invasion analysis for new cards

- **Hypothesis.** A proposed new card either (a) becomes a monomorphic attractor
  (game-breaking), (b) joins a polymorphic support (healthy addition), or (c) dies out
  (irrelevant).
- **Method.** Add the candidate's row/column to M(W); run replicator dynamics; classify.
- **Success.** The method produces a classification reportable at card-review time,
  pre-registering the question "does the metagame absorb this card?"

## 8. Limitations

- **Symmetric random matching is a simplification.** Replicator dynamics assume random
  pairing against a population; run-based drafts are sequential and information-asymmetric.
  The formalism is an approximation of the real metagame, not a full model of it.
- **M_ij needs a variance model.** Win probabilities require a seed distribution; the
  structural route (§2.2) approximates, the empirical route measures. Either way, M is an
  estimate with confidence intervals, not a constant.
- **PVE caveat.** In Mana Battle today the "population" is the designer's generated
  content, not players. §4's population formalism applies directly only once multiplayer
  exists (server Phase 2).
- **Stability is per-matrix, not generic.** The replicator dynamics converge in some game
  classes and cycle in others; the classification is measured per M(W), never asserted
  from theory alone.
- **Psychology is outside the model.** §6 says what keeps knowledge rewarding under a
  stability assumption; it does not claim to predict players.

## 9. Glossary

- **Strategy** — a kit or composition a player can field.
- **Population** — the distribution of strategies players field.
- **Race form** — matchup outcome model: T_i = min{ t : C_i(t) ≥ H }; i beats j iff
  T_i < T_j.
- **Win probability** — P(i beats j) over the seed distribution.
- **Payoff matrix** M(W) — M_ij(W) = P(i beats j) at window W.
- **Strict dominance** — a strategy beaten by another against every opponent.
- **Nash equilibrium** — a population in which every fielded strategy is a best response.
- **Pure strict NE** — "the best answer to the field is the field": the stale-metagame
  signature.
- **ESS** — an invasion-proof best response to itself.
- **Replicator dynamics** — dx_i/dt = x_i(f_i − f̄); the metagame evolution model.
- **Monomorphic / polymorphic equilibrium** — one strategy / several strategies in support.
- **Limit cycle** — non-converging population dynamics (rock-paper-scissors structure).
- **Catalog vs conditional knowledge** — static lookup vs context-dependent skill.
