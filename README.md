# Mana Battle

You can play it for free on [itch](https://lfarroco.itch.io/mana-battle).

The [Steam](https://store.steampowered.com/app/3757600/Mana_Battle) version offers Achievements and Cloud Saves.

A trigger-based autobattler in a 3x3 board.

## Overview

**Mana Battle** is a strategic auto-battler where players build teams and try to outlive the enemy team's core. Key features:

- Each unit has a "cooldown" in seconds, not turns
- Combat simulated in pure environment, generating data 
- Steam achievements and cloud saves
- Cross-platform: Windows, macOS, Linux

## Tech Stack

- **Phaser 3** - Game engine
- **TypeScript** - Language
- **Electron** - Desktop wrapper
- **Steam** - Achievements & cloud saves

## Architecture

- Client (`phaser/src/`)
  - Screens
    - (Some Screen)
      - Components
      - Phases
  - Events
- Client Framework (`framework/`): system for managing screens and listeners
- Core game logic (`core/`):  pure, framework-agnostic package

## Documentation

Detailed documentation is organized by topic in the `docs` directory:

- **[Project Architecture](docs/project-architecture.md)** - High-level architecture chart showing runtime, pure logic, combat playback, server abstraction, and platform layers.
- **[Building and Running](docs/building-and-running.md)** - Setup instructions, available commands, and platform requirements
- **[Unit Balance](docs/unit-balance.md)** - Complete guide to the unit power and cost calculation system, including action/reaction budgets, trigger frequencies, effect costs, and balancing formulas
- **[Trigger System](docs/trigger-system.md)** - Documentation on the Action-Reaction model, including trigger conditions, targeting, and effect types
- **[Storage System](docs/storage-system.md)** - Details on the Storage Provider pattern and Steam Cloud / LocalStorage integration
- **[Localization System](docs/localization.md)** - Architecture, usage, and guide for adding new languages
- **[Achievement System](docs/achievement-system.md)** - Overview of Steam achievement integration, victory tiers, and calculation logic
- **[Combat Architecture](docs/combat-architecture.md)** - Documentation of the client-server separation for combat simulation.
- **[Game Server Plan](docs/game-server.md)** - Phased plan for the new Node multiplayer backend (replaces the retired Supabase functions).
- **[Battle System](docs/battle-system.md)** - Core combat loop, phase management, and board logic.
- **[Character/Unit System](docs/character-unit-system.md)** - Unit definitions, classes, and asset management.
- **[Audio System](docs/audio-system.md)** - Music and SFX management.
- **[UI System](docs/ui-system.md)** - UI components, event handling, layout management.
- **[Effect System](docs/effect-system.md)** - Visual effect pipeline and combat integration.
- **[Options System](docs/options-system.md)** - Options data model, persistence, UI bindings.

## AI Agent Entry Point

See [AGENTS.md](AGENTS.md) for the AI agent guide — project knowledge index, current issues, task queue, and workflow instructions.

## Publishing

> Release builds must be made with `MANA_SERVER_URL=https://api.manabattle.com`
> (and `MANA_ITCH_CLIENT_ID` for the web build) so multiplayer points at the
> deployed server instead of the player's own `http://127.0.0.1:8787`. The
> production webpack build warns if either is missing. See
> [docs/building-and-running.md](docs/building-and-running.md) and
> [docs/release-audit.md](docs/release-audit.md).

- Steam: `MANA_SERVER_URL=https://api.manabattle.com make electron-build-all`, then `make steam-publish`.
- Steam Demo: `MANA_SERVER_URL=https://api.manabattle.com make electron-build-demo`, then `make steam-publish-demo`.
- Itch: `MANA_SERVER_URL=https://api.manabattle.com MANA_ITCH_CLIENT_ID=f20213f3887151a962afac88d0145c57 npm run build`, zip the contents of `dist`, and upload to Itch.io.
- Android: run `make android-build`, then, in Android Studio, Build > Generate Signed Bundle / APK.
