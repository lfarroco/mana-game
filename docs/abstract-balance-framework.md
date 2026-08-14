# A Temporal, Window-Aware Framework for Autobattler Balance

> **Design context:** this document analyzes the balance model in
> [unit-balance.md](unit-balance.md) (Actual Power) and the tier design in
> [card-design-philosophy.md](card-design-philosophy.md) through a temporal lens.
> Mana Battle is the recurring worked instance, but the framework itself is stated in
> game-agnostic terms and applies to autobattlers / automated combat games with
> deterministic simulation. The ambition is deliberately narrow: one core idea, precise
> definitions, and an executable validation protocol.

## 1. Thesis and Scope

**Thesis.** A unit's balance is better represented by its value-over-time profile than by a
single scalar score, and the evaluation window is a first-class parameter of balance,
because relative strength between units can change over time.

Three claims:

1. **Every kit is a curve.** A unit (kit) induces a function p(t): value delivered per unit
   time at time t. Two kits can produce the same output yet differ in _when_ they deliver
   it.
2. **"Who is stronger?" has no answer without a window.** A kit that is behind for the
   first half of a fight can be ahead by the end. The combat window W is a balance
   parameter, not a backdrop.
3. **Scalar scores are value-at-one-window.** Mana Battle's Actual Power (AP) is the value
   a kit delivers over a fixed 5-second accounting window. That single number cannot
   represent matchups, dominance, or the time structure that decides who wins.

**Scope.** Autobattlers / automated combat games where combat is deterministic simulation
and value flows to a small number of sinks (crystals, heroes, bases). Mana Battle satisfies
this: a 3×3 board, units that target the two crystals only, deterministic seed-fixed combat
at 16.67 ms ticks.

**What this document is not.** A theory of all game balance, a pricing engine, or a
replacement for simulation-based testing. It is a vocabulary and a measurement protocol for
the temporal structure that scalar scores drop.

## 2. Definitions and the Formal Core

### 2.1 The object of study

- **Sink** — the object value is delivered to (in Mana Battle, the two crystals).
- **Kit** — a unit's full definition: stats (power, cooldown, critical, life), effects,
  reactions, position.
- **Context** — the team and opponent a kit fights in. A kit's value depends on context;
  §4 fixes a reference context (solo versus a bare sink).

### 2.2 Profiles and cumulatives

> **Profile** p(t) — value delivered to the sink per unit time at wall-clock time t.
> **Cumulative** C(t) = ∫₀ᵗ p(u) du — total value delivered up to time t.
> **Total value over window** V_W = C(W) — total value delivered by time W.

For a discrete simulation, p is the per-tick increment and C the running sum; the integral
notation is the continuous envelope (see §5).

Two idealized shapes used throughout:

| Kit shape   | Profile p(t) | Cumulative C(t) |
| ----------- | ------------ | --------------- |
| Flat        | c            | c·t             |
| Linear ramp | a + k·t      | a·t + (k/2)·t²  |

### 2.3 Crossings

For two kits x and y:

> **Instantaneous crossing** t₁(x, y) — the first t > 0 with p_x(t) = p_y(t): both kits
> deliver the same value per unit time at t₁.
> **Cumulative crossing** t₂(x, y) — the first t > 0 with C_x(t) = C_y(t): both kits have
> delivered the same total value by t₂.

t₂ is the _flip point_: for windows shorter than t₂, one kit leads the cumulative
comparison; for windows longer than t₂, the other leads (ignoring later crossings).

**Theorem (flat vs linear ramp).** Let p_x(t) = c (constant) and p_y(t) = a + k·t (linear
ramp), with c > a > 0 and k > 0. Then

- t₁ = (c − a) / k
- t₂ = 2(c − a) / k = 2·t₁

_Proof._ t₁ solves c = a + k·t. For t₂, solve c·t = a·t + (k/2)·t²; the nonzero root is
t = 2(c − a)/k. ∎

Worked numbers: c = 100, a = 80, k = 2 ⇒ t₁ = 10, t₂ = 20 — the ramper overtakes the flat
kit's total output at exactly twice the window at which its per-tick rate overtakes.

_Assumption._ Continuous time and idealized profiles. Real kits have discrete cooldowns,
travel times, and reactions, so measured crossings approximate the formula; §4 fixes an
explicit tolerance.

### 2.4 Dominance and verdicts

> **Dominance.** x dominates y on [0, W] iff C_x(t) ≥ C_y(t) for all t ≤ W. Strict
> dominance if, in addition, C_x(t) > C_y(t) for some t ≤ W.
> **Verdict.** winner_W(x, y) = the kit with the larger V(W); a draw if equal.
> **Flip window.** A W at which C_x(W) = C_y(W); verdicts change exactly at cumulative
> crossings.

Two consequences:

- **Dominance implies the verdict at every window:** if x dominates y on [0, W], then
  V_x(W) ≥ V_y(W). Dominance is the strongest static comparison the profile view offers.
- **Equal AP implies nothing about ordering.** Two kits with the same value at the
  5-second accounting window can be incomparable (each wins some window) or strictly
  ordered (one dominates at every window). A single window's value decides nothing about
  the ordering at other windows.

### 2.5 AP is the value at one fixed window

Mana Battle's AP is defined as value delivered per 5-second accounting window
([unit-balance.md](unit-balance.md) §6): action power = (effect value per use) × (5 s /
cooldown), plus priced reactions. In profile notation this is exact:

> AP = V_5 = ∫₀⁵ p(t) dt — the total value delivered over the 5-second accounting window.

This is definitional, not an approximation: AP is one point on the window sweep
{W ↦ V_W}. It cannot see the shape of p, and therefore cannot distinguish kits that agree
at 5 s but differ everywhere else — precisely the information the crossings and dominance
analysis needs.

### 2.6 What the core does and does not claim

- **Definitions:** profiles, cumulatives, crossings, dominance, verdicts (§2.2–2.4).
- **One theorem:** flat vs linear ramp, t₂ = 2·t₁, under stated assumptions (§2.3).
- **One exact relation:** AP = value at the 5-second window (§2.5).
- **Criteria (heuristics, not theorems):** a budget class is healthier when no kit strictly
  dominates another and no two kits deliver the same shape inside the window; windows and
  shapes are inseparable. These are stated so they can be tested (§4), not asserted as
  laws.

## 3. Why a Scalar Is Insufficient

This section states the motivation as a hypothesis, not a result — §4 specifies how to test
it.

**Hypothesis H0 (the poison problem).** A kit that deals 10 damage per tick and a kit that
applies one poison stack per tick (each stack dealing 1 per tick) have identical per-use
pricing in the AP model (2 × power, [unit-balance.md](unit-balance.md) §9). Their idealized
cumulatives are C = 10·t and C = t²/2. These curves cross at t₂ = 20: each kit wins exactly
the windows on its side of the crossing. If this holds in measurement, a scalar score
equalizes the two while the temporal view shows their matchup flips at a specific window —
the concrete demonstration that "equal AP" is not "balanced."

Two structural reasons the scalar cannot be fixed by tuning alone:

1. **A single window erases the rest of the curve.** AP is value at 5 s (§2.5). Two kits
   can agree at 5 s and diverge at 20 s or 30 s; the scalar reports one point of the window
   sweep and calls it balance.
2. **The window is a parameter, not a backdrop.** Mana Battle's 30 s design window (and its
   120 s hard cap) is a balance decision: it sets a floor on how slow a slow build may be.
   A framework that treats W as fixed cannot even ask "would a 20 s combat fix this card?";
   the temporal framework makes it a first-class query (§4, E3).

The framework does not claim AP is useless — it claims AP answers "value at the 5-second
window" and nothing else. The temporal view answers the structural questions (matchups,
dominance, window verdicts), and §4 specifies how to measure it against the real
simulator.

## 4. Validation Protocol (Mana Battle)

This section is a protocol, not a results report. It specifies exactly how to measure
profiles, crossings, and dominance against the real simulator so the claims in §2–§3 can
be tested. Execution is future work (§7).

### 4.1 Scenario construction

For each card c in a curated pool P:

1. Register the base collection (`Card.setCardsMap(CARDS_BY_ID)`, per the harness in
   `core/src/__test_utils__/combatHarness.ts`).
2. Player team: `[Card.makeUnit(FORCE_ID_PLAYER, c.id, [0, 0])]`; the harness adds a player
   crystal automatically.
3. Enemy team: a bare `critical_crystal` at `[0, 2]` with life = maxLife = 10⁶ and cooldown
   = 99999 — it never acts, combat never ends early, and poison has room to ramp.
4. Fixed, documented seed (e.g. `"balance-validation-v1"`).
5. Run the simulator for 1799 frames at SIM_DELTA = 16.67 ms (≈ 29.98 s) and keep only log
   entries with timeMs < 30 000.

The 30-second cap is not arbitrary: the timeout storm activates at exactly 30 000 ms
(`TIMEOUT_DAMAGE_START_TIME` in `core/src/math/Constants.ts`), so the design window
[0, 30 s) is uncontaminated by it.

### 4.2 Pool selection

P (~8 cards, chosen from `ALL_CARDS` at execution) spans the shapes:

- short-cooldown flat damage (repeated direct damage);
- a poison ramper (stacking poison applications);
- a high-cooldown high-power damage kit (burst/spike);
- at least two near-equal-AP pairs (|AP_x − AP_y| ≤ ε, AP from the model formula in
  `unit-balance.md` §§6–13) chosen so the pairs differ in cooldown/power tradeoffs;
- a control card with a known allowlisted deviation (e.g. `gambler`) for calibration.

Selection rationale: overlap in scalar value, spread in temporal shape. The exact ids and
computed APs are recorded in the results appendix at execution.

### 4.3 Curve reconstruction

- Sample points (timeMs, newLife) from `damage_hit` entries with targetId = cpuCore.id and
  from `poison_tick` entries with force = FORCE_ID_CPU.
- Cumulative: C(t) = initialLife − newLife(t), linearly interpolated between sample points.
- Cross-check: accumulate `lifeDelta` over the same entries; the two reconstructions must
  agree exactly (a guard against log-schema drift).
- Reactions that can fire solo (e.g. self-triggered) are included by construction — the
  measurement is the kit's full solo delivery.

### 4.4 Measurements

For the pool:

- V_c(W) at W ∈ {5 s, 10 s, 20 s, 30 s}.
- AP_c by the model formula.
- Pairwise cumulative crossings: first sign change of C_x − C_y on [0, 30 s].
- Pairwise dominance predicates on [0, 30 s] (§2.4).
- Window-sweep rankings: rank P by V at each W.

### 4.5 Pre-registered expectations

Each hypothesis has a falsification criterion; results are reported as measured.

- **H1 (equal-AP divergence).** ∃ pair with |AP_x − AP_y| ≤ ε whose cumulatives cross
  inside [0, 30 s]. _If none: the thesis is not demonstrated on this pool._
- **H2 (crossing predictability).** For flat-vs-ramp pairs, measured t₂ is within ±2 s of
  the closed form (§2.3), and the winner before/after t₂ matches the prediction. The
  tolerance covers cooldown discretization and travel time. _If systematically off: the
  closed form does not transfer to discrete kits._
- **H3 (window sensitivity).** The W = 30 s ranking differs from the W = 5 s ranking by at
  least one adjacent swap. _If identical: the pool is window-stable; report that, since it
  is itself informative._
- **H4 (dominance visibility).** Report all strict-dominance pairs on [0, 30 s], noting
  that AP bands alone cannot detect them. _If none: state so — the claim is "AP cannot see
  dominance," not "dominance must exist."_

### 4.6 Reporting rules

Tables per experiment. A falsified hypothesis is reported with its criterion and a
discussion; it is not silently dropped. The AP column accompanies every table so the scalar
view and the temporal view are directly comparable.

## 5. Discussion and Limitations

- **Context-dependence.** Profiles are measured in a reference context (solo versus a bare
  sink, §4.1). Real boards add enemy pressure, team composition, and reactions — the main
  cross-term. A solo curve is the cleanest first measurement, not the last word; §7 E5
  extends to full-team contexts.
- **Superposition is approximate.** Team cumulative value = Σ unit cumulatives ignores
  reaction cross-terms. It is exact in Mana Battle only because offense has a single sink
  per team and reactions are the sole interaction between units.
- **Discrete vs continuous.** The integrals in §2 are the envelope of a path that ticks at
  16.67 ms with 200 ms reaction delays. For crossings closer than roughly 200 ms apart,
  use the simulation, not the formula.
- **Window cap.** Measurements stop at 30 s; statements about longer windows are
  extrapolations (curvature direction within the window), not measurements.
- **The window is not the only dial.** Budget, tier bands, upgrade curves, and crit
  variance all interact with W. This framework isolates W; it does not claim W dominates
  the others.
- **The scalar remains useful.** AP is the right cheap aggregate for grading a large pool.
  The temporal view is the structural complement: it answers the questions AP cannot, and
  §4 defines how the two are reconciled empirically.

## 6. Extensions (Optional)

The core (§2–§5) is self-contained. The following ideas extend it. None are needed for the
thesis; only the first is formalizable today; the heavier vocabulary is deliberately not
used in the core. The population-level layer — how the distribution of players responds to
these profiles, and how the designer avoids a stale metagame — is developed in the
companion document [metagame-and-game-theory.md](metagame-and-game-theory.md).

### 6.1 Retiming equivalence

Two kits are **retiming-equivalent** if their profiles coincide up to a reparameterization
of time: p_x = p_y ∘ φ for a strictly increasing time-warp φ. This is an equivalence
relation. As a design criterion: kits in the same class deliver value in the same _shape_
on different clocks — and haste/slow are exactly time-warps. Whether real cards fall into
the same class is a measurement question, listed as a future experiment rather than
asserted as a property of any card.

### 6.2 Exchange-rate tuning heuristic

Effects convert one currency into another (power → damage, time → casts, power → tempo).
Tuning baselines is "choosing exchange rates." The heuristic: an unconditional conversion
whose output value exceeds its input value creates value from nothing; gate it (reaction,
condition) or cap its output. This restates the intuition behind the conditional discount
and reaction trigger-frequency accounting in [unit-balance.md](unit-balance.md) §§7–11
without a pricing theory. It is not a theorem: it presumes a stable rate table exists,
which is not established.

### 6.3 Category-theoretic language (optional)

Composition (effects as sequential transitions), retiming equivalence (§6.1), and window
verdicts can be organized category-theoretically. Nothing in §2–§5 depends on this
vocabulary; it is offered as organizing language, and its heavier terms (functors, natural
transformations) are neither used nor claimed here.

## 7. Experiments

E1–E4 operationalize §4. Status: **not yet executed**. Each entry states hypothesis, method,
and success criterion so execution is mechanical.

- **E1 — Equal-AP divergence (H1).** Method: §4.1–4.4. Success: an equal-AP pair whose
  verdict flips across W (e.g. V at 10 s vs 30 s).
- **E2 — Crossing prediction (H2).** Method: §4.1–4.4 on flat/ramp pairs. Success:
  |measured t₂ − predicted t₂| ≤ 2 s and winner direction matches on both sides.
- **E3 — Window-sweep ranking (H3).** Method: §4.3–4.4. Success: the ranking at W = 30 s
  differs from W = 5 s by at least one adjacent swap.
- **E4 — Dominance audit (H4).** Method: §4.3–4.4. Success: dominance matrix reported; any
  strict-dominance pair is a rework candidate by the criteria in §2.6.
- **E5 — Full-context profiles (future).** Measure C(t) with the kit in a real team and a
  reaction trigger active, to quantify the superposition error (§5).
- **E6 — Sensitivity sweep (future).** Re-run the §4.1 scenario with cooldown/power
  perturbed ±10% to rank which parameters move crossings and verdicts the most.

## 8. Glossary

- **Sink** — the object value is delivered to (in Mana Battle, the crystals).
- **Kit** — a unit's full definition: stats, effects, reactions, position.
- **Profile** p(t) — value delivered to the sink per unit time.
- **Cumulative** C(t) — total value delivered up to time t.
- **Total value** V_W — C(W), value at window W.
- **Crossing** — t₁ (instantaneous, per-tick rates equal) / t₂ (cumulative, totals equal).
- **Flip point** — a cumulative crossing; a window at which the verdict changes.
- **Dominance** — C_x ≥ C_y pointwise on [0, W].
- **Window** W — combat length; a first-class balance parameter.
- **AP** — Mana Battle's scalar; the value delivered over the 5-second accounting window.
