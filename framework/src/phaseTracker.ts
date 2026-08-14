/**
 * Internal tracking machinery for createScreen(): the PhaseTracker and
 * TrackedGroup classes, the fire-and-forget runDestroy() helper, and the
 * module-level active-tracker registry backing findTrackedById().
 *
 * Extracted from createScreen.ts (pure refactor — no behavior change).
 * This module has no runtime imports — it only manipulates plain maps and
 * Destroyable objects — so it stays unit-testable without any engine mock.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal shape the tracker needs — anything with a destroy() method.
 * destroy() may return a promise; go()/refresh() await phase teardowns
 * before running the next handler (P1a).  Satisfied by
 * Phaser.GameObjects.GameObject (`destroy(fromScene?)` is assignable to
 * `() => void`), event unsubscribers, and by plain wrapper objects
 * (e.g. BackgroundOverlay) that manage underlying resources.
 */
export type Destroyable = { destroy: () => void | Promise<void> };

/** Options for single-object add(). */
export type SingleTrackOpts = { id?: string };

/** Options for array add().  idPrefix produces keys like "prefix-0", "prefix-1", ... */
export type ArrayTrackOpts = { idPrefix?: string };

// ---------------------------------------------------------------------------
// TrackedGroup — a conceptual container for elements returned by phase
// handlers.  When the group is destroyed, all its children are destroyed.
// This avoids coupling to a specific engine's container while still providing
// group-cleanup semantics.
// ---------------------------------------------------------------------------

export class TrackedGroup implements Destroyable {
  private children: Destroyable[] = [];

  /** The raw returned elements, for transitions to animate. */
  get elements(): Destroyable[] {
    return this.children;
  }

  add(child: Destroyable): void {
    this.children.push(child);
  }

  /** Destroy all children.  May be async (P1a) — children's destroy() can return promises. */
  async destroy(): Promise<void> {
    const children = this.children;
    this.children = [];
    await Promise.all(children.map((child) => child.destroy()));
  }
}

/**
 * Fire-and-forget destroy used by screen-level teardown (P1a): the caller
 * does not await the result, so sync throws and async rejections are
 * swallowed rather than surfacing as unhandled rejections.
 */
export function runDestroy(d: Destroyable): void {
  try {
    const result = d.destroy();
    if (result instanceof Promise) {
      void result.catch(() => {});
    }
  } catch {
    // Ignore — teardown is best-effort.
  }
}

// ---------------------------------------------------------------------------
// PhaseTracker
// ---------------------------------------------------------------------------
export class PhaseTracker<TPhase extends string> {
  private persistent = new Map<string, Destroyable>();
  private phaseObjects = new Map<string, Destroyable>();
  private mode: "persistent" | "phase" = "persistent";
  private counter = 0;

  currentPhase: TPhase | null = null;

  constructor() {
    activeTracker = this as unknown as PhaseTracker<string>;
  }

  /** Track a single object or an array of objects in the current scope. */
  track(
    obj: Destroyable | Destroyable[],
    opts?: SingleTrackOpts | ArrayTrackOpts,
  ): void {
    const target = this.mode === "phase" ? this.phaseObjects : this.persistent;
    this.trackInto(target, obj, opts);
  }

  /**
   * Track directly into the persistent layer, regardless of the current mode.
   * Used for create()'s returned elements: they must survive phase transitions
   * even if the screen fired an initial ctx.go() without awaiting it (which
   * would otherwise leave the tracker in "phase" mode when they are returned).
   */
  trackPersistent(
    obj: Destroyable | Destroyable[],
    opts?: SingleTrackOpts | ArrayTrackOpts,
  ): void {
    this.trackInto(this.persistent, obj, opts);
  }

  private trackInto(
    target: Map<string, Destroyable>,
    obj: Destroyable | Destroyable[],
    opts?: SingleTrackOpts | ArrayTrackOpts,
  ): void {
    if (Array.isArray(obj)) {
      const prefix =
        (opts as ArrayTrackOpts)?.idPrefix ?? `__tracked_${this.counter}_`;
      obj.forEach((item, i) => {
        this.setTracked(target, `${prefix}${i}`, item);
      });
      this.counter += obj.length;
    } else {
      const key =
        (opts as SingleTrackOpts)?.id ?? `__tracked_${++this.counter}`;
      this.setTracked(target, key, obj);
    }
  }

  /**
   * Register `obj` under `key`, guarding against silent duplicate ids (P2).
   * Auto-generated keys (`__tracked_...`) are counter-based and never collide,
   * so this only fires for explicit ids/idPrefixes.  On a duplicate we warn and
   * keep the first registration — the first caller owns the id, and overwriting
   * would silently orphan the original object (never destroyed → leak).
   */
  private setTracked(
    target: Map<string, Destroyable>,
    key: string,
    obj: Destroyable,
  ): void {
    if (target.has(key)) {
      console.warn(
        `[createScreen] track("${key}") ignored — an object with that id is ` +
          `already tracked in the same scope. Keeping the first registration.`,
      );
      return;
    }
    target.set(key, obj);
  }

  findById<T extends Destroyable>(id: string): T | undefined {
    return (
      (this.persistent.get(id) as T | undefined) ??
      (this.phaseObjects.get(id) as T | undefined)
    );
  }

  /** All elements tracked by the current phase (for exit transitions). */
  getPhaseElements(): Destroyable[] {
    return Array.from(this.phaseObjects.values());
  }

  /** Enter phase scope: subsequent add() calls register to the phase. */
  beginPhase(): void {
    this.mode = "phase";
  }

  /** Leave phase scope: subsequent add() calls register to the persistent layer. */
  endPhase(): void {
    this.mode = "persistent";
  }

  /** Destroy every object tracked by the current phase.  May be async (P1a). */
  async clearPhase(): Promise<void> {
    const objs = Array.from(this.phaseObjects.values());
    this.phaseObjects.clear();
    await Promise.all(objs.map((o) => o.destroy()));
  }

  /** Destroy everything tracked (phase + persistent) and detach the active-tracker ref. */
  destroyAll(): void {
    // Screen-level teardown is fire-and-forget (P1a): phase destroys may be
    // async but the caller (screen destroy()) does not await them — the
    // scene is being wiped anyway.  Rejections are swallowed.
    void this.clearPhase().catch(() => {});
    for (const obj of this.persistent.values()) {
      runDestroy(obj);
    }
    this.persistent.clear();
    this.currentPhase = null;
    if (activeTracker === (this as unknown as PhaseTracker<string>)) {
      activeTracker = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Active-tracker registry — only one screen is active at a time (navigation
// is serialised by the nav mutex in the ScreenManager), so a single module-level
// reference is enough for helpers that lack ctx access.
// ---------------------------------------------------------------------------

let activeTracker: PhaseTracker<string> | null = null;

/** Find a tracked element by ID on the currently active screen. */
export function findTrackedById<T extends Destroyable>(
  id: string,
): T | undefined {
  return activeTracker?.findById<T>(id);
}
