# Mana Battle

You can play it for free on [itch](https://lfarroco.itch.io/mana-battle).

The [Steam](https://store.steampowered.com/app/3757600/Mana_Battle) version offers Achievements and Cloud Saves.

A PVE, trigger-based autobattler in a 3x3 board, built with Phaser 3.

## Overview

**Mana Battle** is a strategic auto-battler where players build teams, manage resources, and engage in tactical combat. Key features:

- Real-time tactical combat with unit synergies
- Unit management and progression system
- Steam achievements and cloud saves
- Cross-platform: Windows, macOS, Linux

## Quick Start

```bash
cd phaser
npm install
npm run dev
```

Opens at `http://localhost:8080`

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production web build |
| `npm run electron:dev` | Run desktop app |
| `npm run electron:build:all` | Build for all platforms |
| `npm run test` | Run all tests |

## Tech Stack

- **Phaser 3** - Game engine
- **TypeScript** - Language
- **Electron** - Desktop wrapper
- **Steam** - Achievements & cloud saves

## Documentation

Detailed documentation is organized by topic in the `docs` directory:

- **[Unit Balance](docs/unit-balance.md)** - Complete guide to the unit power and cost calculation system, including action/reaction budgets, trigger frequencies, effect costs, and balancing formulas

## Links

- [Repository](https://github.com/lfarroco/mana-game)
- [Issues](https://github.com/lfarroco/mana-game/issues)