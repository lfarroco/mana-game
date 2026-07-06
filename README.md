# Mana Battle

You can play it for free on [itch](https://lfarroco.itch.io/mana-battle).

The [Steam](https://store.steampowered.com/app/3757600/Mana_Battle) version offers Achievements and Cloud Saves.

A trigger-based autobattler in a 3x3 board.

## Overview

**Mana Battle** is a strategic auto-battler where players build teams and engage in tactical combat. Key features:

- Real-time tactical combat with unit synergies
- Steam achievements and cloud saves
- Cross-platform: Windows, macOS, Linux

## Tech Stack

- **Phaser 3** - Game engine
- **TypeScript** - Language
- **Electron** - Desktop wrapper
- **Steam** - Achievements & cloud saves

## Architecture

- Client
  - Screens (Scenes)
    - Components
    - Effects
  - Events
- Server

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
- **[Multiplayer Architecture](docs/multiplayer-architecture.md)** - Documentation of the multiplayer mode and server-driven phase management.
- **[Multiplayer Setup & Usage](docs/MULTIPLAYER_SETUP.md)** - Guide for running the server, database, and integration tests.
- **[Battle System](docs/battle-system.md)** - Core combat loop, phase management, and board logic.
- **[Character/Unit System](docs/character-unit-system.md)** - Unit definitions, classes, and asset management.
- **[Audio System](docs/audio-system.md)** - Music and SFX management.

## Documentation Roadmap

The following systems still need to be documented. If you find sections in the game that need documentation, please add them here.

- [ ] **UI System** - User interface components and layout management
- [ ] **Effect System** - Visual effects and particle systems
- [ ] **Options/Preferences System** - User settings and configuration

## Migration Plans

- **[Server-Side Combat Migration](docs/server-side-combat-migration.md)** - Plan for decoupling the combat runner from Phaser for server-side verification.

## AI Agent Entry Point

See [AGENTS.md](AGENTS.md) for the AI agent guide — project knowledge index, current issues, task queue, and workflow instructions.

## Publishing

- Steam: run `make electron-build-all`, then `make steam-publish`.
- Stem Demo: run `make electron-build-demo`, then `make steam-publish-demo`.
- Itch: `npm run build`, zip the contents of `dist`, and upload to Itch.io.
- Android: run `make android-build`, then, in Android Studio, Build > Generate Signed Bundle / APK.
