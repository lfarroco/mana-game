# Combat Playback Performance: Further Optimizations

This document describes additional performance optimization opportunities for the combat playback system, beyond the initial round implemented in July 2026 (sorted pointer, counter-based completion check, texture pre-creation, and charge bar throttling in `CombatPlaybackController.ts`).

## Current Bottleneck: Frame-Spike Visual Spawning

The playback controller fires all eligible animations synchronously within a single Phaser `update` tick. When multiple combat log entries land on the same frame — common during speed-up or when effects cluster — dozens of sprites, tweens, and timer events are created all at once. Each `arcaneMissileTargeted()` call alone can produce:

| Object type | Typical count per call |
|---|---|
| `scene.add.image()` sprites | 20–60 (one per beam segment) |
| `scene.tweens.add()` fade-out tweens | 20–60 |
| `scene.time.delayedCall()` timers | 20–60 |
| `scene.add.rectangle()` impact rects | 8–30 |
| `scene.tweens.add()` impact scatter tweens | 8–30 |

At 2× game speed with 5–8 units firing every 1–2 seconds, a single frame can spawn **200–500 Phaser objects** — causing visible frame hitches on older hardware.

---

## Optimization 1: Tween / Visual Frame-Splitter

### Problem

`updateFrame()` executes triggered animations inline:

```ts
while (nextAnimation.startTime <= currentTime) {
    executeAnimation(anim);  // synchronous visual spawning
    nextAnimationIndex++;
}
```

All visual work for the frame runs inside the same `scene.events.on("update")` callback, blocking the render pipeline.

### Proposed Solution

Introduce a **frame-splitter** that caps the number of heavy visual effects processed per frame and defers the remainder to subsequent ticks.

```
┌─────────────────────────────────────────┐
│  updateFrame() — Phaser "update" event  │
├─────────────────────────────────────────┤
│  1. Advance playback clock              │
│  2. Collect pending animation logs      │
│  3. Enqueue into visualWorkQueue        │
│  4. Process up to MAX_PER_FRAME items   │
│  5. Check completion (unchanged)        │
└─────────────────────────────────────────┘
```

#### Implementation sketch

```ts
const MAX_VISUAL_EFFECTS_PER_FRAME = 3;
const visualWorkQueue: ScheduledAnimation[] = [];

const updateFrame = (_combatState, _time, delta) => {
    // ... advance clock, collect pending animations into queue ...
    let processed = 0;
    while (visualWorkQueue.length > 0 && processed < MAX_PER_FRAME) {
        const anim = visualWorkQueue.shift()!;
        if (!anim.executed) { executeAnimation(anim); processed++; }
    }
};
```

#### Suggested MAX_PER_FRAME values

| Particle quality | Max effects / frame |
|---|---|
| `"low"` | 2 |
| `"medium"` (default) | 3 |
| `"high"` | 5 |

Tie to `getSettings().particles` at controller creation time.

#### Trade-offs

| Pro | Con |
|---|---|
| Eliminates frame spikes from clustered effects | Lightweight entries still instant |
| Predictable per-frame visual budget | Slightly spreads visuals over more frames |
| Simple queue, minimal state | Needs drain-all safety valve at extreme speeds |

#### Implemented (2026-08-30)

`MAX_ANIMATIONS_PER_FRAME` in `CombatPlaybackController.ts` caps the log
animations executed per tick, tiered by the particle-quality setting:

| Quality | Max animations / frame |
|---|---|
| `"low"` | 5 |
| `"medium"` (default) | 10 |
| `"high"` | 15 |

The while-loop stops once the cap is reached; the remainder stay "due"
(`startTime` already passed) and execute on subsequent frames, so the timeline
is never dropped — only stretched. Values are higher than the original
2/3/5 sketch because combat logs are now hard-bounded by CombatRunner's runaway
guard (docs/combat-system-improvements.md §1.2): `MAX_COMBAT_LOGS` (20k) caps
total entries, so worst-case playback drains in ~2k frames (~33s at 60 fps,
medium) instead of melting the CPU in a single tick.

---

## Optimization 2: Particle Emitter Pooling

### Problem

`hasteEffect()` and `slowEffect()` create a new `Phaser.GameObjects.Particles.ParticleEmitter` on every call, then destroy it after ~1000ms:

```ts
// hasteEffect.ts — every call
const p = env.scene.add.particles(x, y, key, { ... });
await delay(duration);
p.stop();
await delay(duration);
p.destroy();
```

During busy combat, dozens of emitters exist simultaneously. `new Phaser.Geom.Circle()` inside emit zone configs adds GC pressure.

### Proposed Solution

Pre-allocate a **small pool of reusable emitters** (one per effect type). Toggle visibility and reposition instead of create/destroy:

```ts
type EmitterPoolEntry = {
    emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    inUse: boolean;
};

const hastePool: EmitterPoolEntry[] = [];

function acquire(x: number, y: number): EmitterPoolEntry | null {
    const free = hastePool.find(e => !e.inUse);
    if (!free) return null;
    free.emitter.setPosition(x, y);
    free.emitter.start();
    free.inUse = true;
    return free;
}
function release(entry: EmitterPoolEntry): void {
    entry.emitter.stop();
    entry.inUse = false;
}
```

Initialize the pool at scene start (or first combat), reuse across the session.

#### Trade-offs

| Pro | Con |
|---|---|
| Zero allocation per effect after warm-up | Caps concurrent effects at pool size |
| Reduces GC pauses during combat | Exhausted pool → skip or fallback to allocate |
| Emitters pre-warmed | Requires cleanup on scene transition |

---

## Optimization 3: Single Timer Loop for Beam Segments

### Problem

`arcaneMissileTargeted()` schedules one `scene.time.delayedCall()` per particle segment:

```ts
for (let i = 0; i < totalSegments; i++) {
    scene.time.delayedCall(i * segmentDelay, () => {
        // create sprite + tween for this segment
    });
}
```

40 segments = 40 `TimerEvent` objects in Phaser's clock. 5 missiles = 200 timer events. Each has overhead for priority queue insertion, pause/resume, and cleanup.

### Proposed Solution

Replace per-segment `delayedCall` with a **single `scene.time.addEvent` loop**:

```ts
let seg = 0;
const timer = scene.time.addEvent({
    delay: segmentDelay,
    repeat: totalSegments - 1,
    callback: () => {
        if (seg >= totalSegments) { timer.destroy(); return; }
        const p0 = points[seg], p1 = points[seg + 1];
        // ... create sprite + tween for segment seg ...
        seg++;
    },
});
```

Reduces N timer events to **1 per missile** — a ~40× reduction.

#### Impact burst note

The impact burst (lines 137–169 in `arcaneMissileTargeted.ts`) creates 8–30 rectangles with individual tweens. These could be grouped into batches of 4–5 per tick for similar savings.

#### Trade-offs

| Pro | Con |
|---|---|
| Massive timer reduction (~40× per missile) | Slightly different API |
| Simpler cleanup (one `timer.destroy()`) | Must ensure cleanup on early cancellation |
| Predictable performance | Requires refactoring `arcaneMissileTargeted()` |

|---|---|
| Eliminates frame spikes from clustered effects | Lightweight entries still instant |
| Predictable per-frame visual budget | Slightly spreads visuals over more frames |
| Simple queue, minimal state | Needs drain-all safety valve at extreme speeds |

---

## Optimization 4: Early-Out on Non-Visible Units

### Problem

`updateChargeBars()` iterates over **all** combat units every frame, computing charge rates and updating state, even for units that are dead or off-screen. While visual updates are now throttled to ~15fps, the per-unit logic still runs at 60fps.

### Proposed Solution

Skip processing for dead units and units outside the visible camera bounds:

```ts
for (const unit of units) {
    if (unit.life <= 0) continue;           // dead — skip
    if (!isUnitOnScreen(unit)) continue;     // off-camera — skip
    // ... charge logic ...
}
```

`isUnitOnScreen()` compares the unit's screen position against the camera viewport + margin.

#### Trade-offs

| Pro | Con |
|---|---|
| Trivial to implement | Minimal gain for 3×3 board (most units always visible) |
| Larger impact with bigger future boards | Requires camera bounds reference |

---

## Optimization 5: Object Pool for Beam Sprites

### Problem

Each `arcaneMissileTargeted()` segment creates a new `Phaser.GameObjects.Image` that lives ~400ms before being destroyed by its tween's `onComplete`. With 5 missiles × 40 segments = 200 sprites created and destroyed per second during heavy combat.

### Proposed Solution

Use a **sprite pool** pre-allocated at scene start. Instead of `scene.add.image()` → `sprite.destroy()`, acquire/release:

```ts
function acquireSprite(x: number, y: number, texture: string): Image {
    const sprite = pool.find(s => !s.active) ?? createNewPooledSprite();
    sprite.setActive(true).setVisible(true).setPosition(x, y).setTexture(texture);
    return sprite;
}

function releaseSprite(sprite: Image): void {
    sprite.setActive(false).setVisible(false);
    sprite.setPosition(-1000, -1000);
}
```

A pool of ~100 sprites covers most combat scenarios without falling back to allocation.

#### Trade-offs

| Pro | Con |
|---|---|
| Zero sprite allocation during combat | Increased memory (~100 idle sprites) |
| No GC pressure from sprite destruction | More complex lifecycle management |
| Reusable beyond missiles (popups, etc.) | Pool must be drained on scene transition |

---

## Optimization 6: Merge Adjacent Log Entries

### Problem

The combat log contains paired entries: `damage_cast` → `damage_hit`, `haste_cast` → `haste_hit`, etc. Cast triggers a missile animation; hit triggers shake + stats. For fast-travel effects (200ms), cast and hit often fire in the same or adjacent frames. The `hit` could fold into `cast`, cutting animation count by ~40%.

### Proposed Solution

At log generation time (post-processing pass in `CombatSimulation.simulateCombat()`), merge cast+hit pairs where `travelTime` is below a threshold:

```ts
const mergedLogs = mergePairedEntries(logs, {
    pairs: [["damage_cast","damage_hit"], ["heal_cast","heal_hit"], /* ... */],
    maxTravelGapMs: 300,
});
```

A merged entry (e.g. `damage_full`) carries both cast and hit data.

#### Trade-offs

| Pro | Con |
|---|---|
| ~40% fewer log entries | Requires new merged log types |
| Reduces server memory + client processing | Breaks saved replay format |
| Handlers still animate cast-then-hit | Adds complexity to simulation output |

---

## Priority and Sequencing

Ordered by **effort-to-impact ratio**:

| Priority | Optimization | Effort | Impact | Risk |
|---|---|---|---|---|
| **1** | Single timer loop for beam segments | Low | High | Low |
| **2** | Tween / visual frame-splitter | Medium | High | Low |
| **3** | Particle emitter pooling | Medium | Medium | Low |
| **4** | Object pool for beam sprites | Medium | Medium | Low |
| **5** | Merge adjacent log entries | Medium | Medium | Medium (log format) |
| **6** | Early-out on non-visible units | Low | Low | None |

### Recommended first step

Implement **#1 (single timer loop)** and **#2 (frame-splitter)** together. These two directly address the frame-spike problem and are independent of each other. Together they should smooth out the majority of combat playback jank on older hardware.

### Measuring success

Profile combat playback with Chrome DevTools Performance tab:
1. Start a recording before entering combat
2. Play through a full combat round at 2× speed
3. Check for frames exceeding 16.6ms (60fps budget)
4. After optimizations, the number of long frames should drop significantly, and the "Scripting" category in flame charts should show less time spent in `updateFrame`

