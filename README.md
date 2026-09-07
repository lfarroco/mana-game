# Mana Battle

You can play it for free on [itch](https://lfarroco.itch.io/mana-battle).

The [Steam](https://store.steampowered.com/app/3757600/Mana_Battle) version offers Achievements and Cloud Saves.

A trigger-based autobattler in a 3x3 board. This repository is open source (MIT) — see [Contributing](#contributing) to run it locally or hack on it.

## Quick Start

```bash
cd phaser
npm install
npm run dev        # game at http://localhost:8080
```

```bash
cd server
npm install
npm run dev        # multiplayer API at http://127.0.0.1:8787
```

Single-player and local multiplayer work out of the box. Online logins
(Steam / itch.io / Google) require server-side keys the maintainers hold.
See `cp .env.example .env` and [docs/building-and-running.md](docs/building-and-running.md)
for details.

## Overview

**Mana Battle** is a strategic auto-battler where players build teams and try to outlive the enemy team's core. Key features:

- Each unit has a "cooldown" in seconds, not turns
- Combat simulated in pure environment, generating data 
- Steam achievements and cloud saves
- Cross-platform: Web, Windows, macOS, Linux

## Tech Stack

- **Phaser 3** - Game engine
- **TypeScript** - Language
- **Electron** - Desktop wrapper (Steam release)
- **Capacitor** - Android wrapper
- **Node + express / Firestore + Cloud Functions** - Multiplayer game server
- **Steamworks** - Achievements & cloud saves (Steam release)

## Architecture

- Client (`phaser/src/`)
  - Screens
    - (Some Screen)
      - Components
      - Phases
  - Events
- Client Framework (`framework/`): system for managing screens and listeners
- Core game logic (`core/`):  pure, framework-agnostic package
- Multiplayer server (`server/`): authoritative Node API (sessions, matchmaking, auth) — see [docs/game-server.md](docs/game-server.md)

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

## Contributing

Issues and pull requests are welcome. Each package has its own `AGENTS.md`
with conventions — read it before editing (`core/`, `framework/`, `server/`,
`phaser/`). Run the package's tests + typecheck before submitting; format with
`npm run format` from the repo root. For AI-assisted contributions, start at
[AGENTS.md](AGENTS.md).

## Publishing (maintainers only)

Publishing needs private credentials (Steam, itch.io, Play signing keys) that
are not in this repo — forks cannot run these targets as-is.

> Release builds must be made with `MANA_SERVER_URL=https://us-central1-mana-battle-f3b15.cloudfunctions.net/api`
> (and `MANA_ITCH_CLIENT_ID` for the web build) so multiplayer points at the
> deployed server instead of the player's own `http://127.0.0.1:8787`. The
> production webpack build warns if either is missing. See
> [docs/building-and-running.md](docs/building-and-running.md) and
> [docs/release-audit.md](docs/release-audit.md).

- Steam: `make steam-publish` — builds the desktop app for Windows/macOS/Linux and
  uploads it to Steam via steamcmd (Docker runner by default; credentials in the
  root `.env` — see `steam/STEAM_UPLOAD.md`).
- Steam Demo: `make steam-publish-demo`.
- Itch: `make itch-publish` — builds the web build and pushes it to itch.io via butler.
- Android: run `make android-build`, then, in Android Studio, Build > Generate Signed Bundle / APK.

## License

MIT — see [LICENSE](LICENSE).
