# Mana Battle

You can play it for free on [itch](https://lfarroco.itch.io/mana-battle).

The [Steam](https://store.steampowered.com/app/3757600/Mana_Battle) version offers Achievements and Cloud Saves.

A PVE, trigger-based autobattler in a 3x3 board, built with Phaser 3.

## Overview

**Mana Battle** is a strategic auto-battler where players build teams and engage in tactical combat. Key features:

- Real-time tactical combat with unit synergies
- Unit management and progression system
- Steam achievements and cloud saves
- Cross-platform: Windows, macOS, Linux

## Tech Stack

- **Phaser 3** - Game engine
- **TypeScript** - Language
- **Electron** - Desktop wrapper
- **Steam** - Achievements & cloud saves

## Documentation

Detailed documentation is organized by topic in the `docs` directory:

- **[Building and Running](docs/building-and-running.md)** - Setup instructions, available commands, and platform requirements
- **[Unit Balance](docs/unit-balance.md)** - Complete guide to the unit power and cost calculation system, including action/reaction budgets, trigger frequencies, effect costs, and balancing formulas
- **[Trigger System](docs/trigger-system.md)** - Documentation on the Action-Reaction model, including trigger conditions, targeting, and effect types
- **[Storage System](docs/storage-system.md)** - Details on the Storage Provider pattern and Steam Cloud / LocalStorage integration
- **[Localization System](docs/localization.md)** - Architecture, usage, and guide for adding new languages
- **[Achievement System](docs/achievement-system.md)** - Overview of Steam achievement integration, victory tiers, and calculation logic
- **[Combat Architecture](docs/combat-architecture.md)** - Documentation of the client-server separation for combat simulation.
- **[Multiplayer Architecture](docs/multiplayer-architecture.md)** - Documentation of the multiplayer mode and server-driven phase management.
- **[Multiplayer Setup & Usage](docs/MULTIPLAYER_SETUP.md)** - Guide for running the server, database, and integration tests.

## Documentation Roadmap

The following systems still need to be documented. If you find sections in the game that need documentation, please add them here.

- [ ] **Battle System** - Core combat loop, phase management, and board logic (`phaser/src/Scenes/Battleground`)
- [ ] **Character/Unit System** - Unit definitions, classes, and asset management (`phaser/src/Systems/Chara`)
- [ ] **Audio System** - Music and SFX management (`phaser/src/Systems/AudioManager.ts`)

## Migration Plans

- **[Server-Side Combat Migration](docs/server-side-combat-migration.md)** - Plan for decoupling the combat runner from Phaser for server-side verification.

## Publishing

- Steam: run `npm run electron:build:all`, then `sh scripts/publish_steam.sh` from the `phaser` directory.
- Stem Demo: `npm run electron:build:demo`, then `sh scripts/publish_steam_demo.sh` from the `phaser` directory.
- Itch: `npm run build`, zip the contents of `dist`, and upload to Itch.io.
- Android: run `npm run android:build` in `phaser`, then, in Android Studio, Build > Generate Signed Bundle / APK.