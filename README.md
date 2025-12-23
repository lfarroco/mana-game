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

## Documentation Roadmap

The following systems still need to be documented. If you find sections in the game that need documentation, please add them here.

- [ ] **Battle System** - Core combat loop, phase management, and board logic (`phaser/src/Scenes/Battleground`)
- [ ] **Character/Unit System** - Unit definitions, classes, and asset management (`phaser/src/Systems/Chara`)
- [ ] **Audio System** - Music and SFX management (`phaser/src/Systems/AudioManager.ts`)
