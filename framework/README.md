# @mana/framework

Engine-agnostic client framework for Mana Battle: screen lifecycle, resource
tracking, and typed navigation. Extracted from `phaser/src/` in Phase D of
[docs/framework-formalization.md](../docs/framework-formalization.md).

The package sits between `core/` (pure game logic) and `phaser/src/` (engine
rendering). It has **zero engine imports** — Phaser-specific work is injected
by the host via hooks, so the whole package is unit-testable with plain fakes.

## Modules

| Module             | Contents                                                                                              |
|--------------------|-------------------------------------------------------------------------------------------------------|
| `Screen.ts`        | `ScreenModule` contract: `{ name, init?, create, destroy?, go?, currentPhase? }`                       |
| `createScreen.ts`  | `createScreen(spec)` factory + `screenModule()` export helper, `ScreenCtx`, `Destroyable`, `findTrackedById` |
| `ScreenManager.ts` | `createScreenManager({ screens, hooks })` — registry, nav mutex (serialised, coalescing), typed routes, deep-links |
| `Router.ts`        | `setRouter()` / `go()` / `currentScreen()` — typed navigation without importing the manager            |
| `Event.ts`         | Re-export of the `Event<T>` primitive from `@mana/core`                                                |

## Adding a screen (canonical pattern)

In `phaser/`, run:

```bash
npm run new:screen -- <Name>
```

then register the route (`phaser/src/Screens/ScreenManager.ts` → `Routes`)
and the screen (`phaser/src/Client.ts` → `screens` map).

A screen module looks like:

```ts
import { createEvent } from "@game/Models";
import { createScreen, screenModule } from "@mana/framework";
import { getScreenManager } from "../ScreenManager";

type Events = { backClicked: ReturnType<typeof createEvent<void>> };
type Phase = "main"; // use createScreen<never, Events> + no phases for single-view

const screen = createScreen<Phase, Events>({
	name: "example",

	// Wired per entry, disposed automatically on destroy.
	events: () => {
		const backClicked = createEvent<void>();
		return {
			events: { backClicked },
			listeners: [backClicked.listen(() => void getScreenManager().go("title"))],
		};
	},

	// Persistent layer — survives phase switches. Return Destroyable(s) or
	// ctx.track(obj, { id }) to register cleanup.
	create: async (ctx) => {
		await ctx.go("main");
	},

	// Mutually exclusive sub-states — tracked elements auto-destroyed on transition.
	phases: {
		main: (_ctx) => { /* build phase UI */ },
	},
});

export const { init, create, destroy, go, name } = screenModule(screen);
```

## Host adapter (Phaser)

The host injects engine work via `ScreenManagerHooks`:

- `beforeTransition(from, to)` — emit `screenHidden`, destroy the outgoing
  screen, disable input, fade out, clear the scene, reset the cursor.
- `afterTransition(to)` — emit `screenShown`, fade in, re-enable input.

See `phaser/src/Screens/ScreenManager.ts`.

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest unit tests
```
