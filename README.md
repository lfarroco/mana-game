# Mana Battle

A tactical turn-based battle game built with Phaser 3 and Electron, featuring Steam integration for achievements and cloud saves.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Building & Distribution](#building--distribution)
- [Testing](#testing)
- [Architecture](#architecture)
- [Steam Integration](#steam-integration)

## 🎮 Project Overview

**Mana Battle** is a strategic battle game where players build teams, manage resources, and engage in tactical combat. The game features:

- Turn-based tactical combat system
- Unit management and progression
- Multiple game phases (shop, battleground)
- Steam achievements and cloud saves
- Cross-platform support (Windows, macOS, Linux)

## 📁 Project Structure

```
mana-game/
├── phaser/                    # Main game source code
│   ├── src/                   # TypeScript source files
│   │   ├── Scenes/           # Phaser scenes (game states)
│   │   │   ├── Battleground/ # Combat scene and logic
│   │   │   ├── Core/         # Core initialization scene
│   │   │   ├── Title/        # Main menu and title screen
│   │   │   ├── Options/      # Settings and options UI
│   │   │   └── Debug/        # Development debug tools
│   │   ├── Models/           # Data models and state management
│   │   │   ├── Board.ts      # Game board representation
│   │   │   ├── State.ts      # Global game state
│   │   │   ├── SavedGame.ts  # Save/load functionality
│   │   │   ├── GhostStore.ts # Multiplayer ghost system
│   │   │   └── Entities/     # Game entity definitions
│   │   ├── Systems/          # Core game systems
│   │   │   ├── Chara/        # Character/unit system
│   │   │   ├── Controls/     # Input handling
│   │   │   ├── AudioManager.ts        # Sound and music
│   │   │   ├── AchievementSystem.ts   # Steam achievements
│   │   │   └── PrestigeSystem.ts      # Progression system
│   │   ├── UI/               # User interface components
│   │   │   ├── components/   # Reusable UI elements
│   │   │   ├── UI.ts         # UI management
│   │   │   └── events.ts     # UI event handling
│   │   ├── Components/       # Game object components
│   │   ├── Effects/          # Visual and gameplay effects
│   │   ├── TriggerSystem/    # Event trigger system
│   │   ├── Storage/          # Save data and cloud storage
│   │   ├── Shaders/          # Custom WebGL shaders
│   │   ├── Utils/            # Utility functions
│   │   ├── Constants/        # Game constants and config
│   │   ├── Types/            # TypeScript type definitions
│   │   └── main.ts           # Game initialization
│   ├── electron/             # Electron desktop wrapper
│   │   ├── main.js           # Electron main process
│   │   ├── preload.js        # Preload script
│   │   └── build/            # Build resources
│   ├── public/               # Static assets (sprites, audio, etc.)
│   ├── webpack/              # Webpack configuration
│   ├── e2e/                  # End-to-end tests (Playwright)
│   ├── scripts/              # Build and utility scripts
│   ├── steam_config/         # Steam deployment configuration
│   ├── dist/                 # Web build output
│   ├── dist-electron/        # Electron build output
│   └── dist-steam/           # Steam build output
├── art/                      # Source artwork and assets
│   ├── steam/                # Steam store assets
│   ├── fx/                   # Visual effects source files
│   └── *.svg                 # Vector graphics
└── .github/                  # GitHub Actions workflows
    └── workflows/            # CI/CD pipelines
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- **Git**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/lfarroco/mana-game.git
   cd mana-game
   ```

2. Install dependencies:
   ```bash
   cd phaser
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The game will open in your default browser at `http://localhost:8080`.

## 💻 Development

### Available Scripts

Navigate to the `phaser/` directory to run these commands:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with logging |
| `npm run dev-nolog` | Start development server without logging |
| `npm run build` | Build production web bundle |
| `npm run electron` | Run Electron app |
| `npm run electron:dev` | Build and run Electron app |
| `npm run electron:build` | Build Electron app for current platform |
| `npm run electron:build:win` | Build for Windows |
| `npm run electron:build:mac` | Build for macOS |
| `npm run electron:build:linux` | Build for Linux |
| `npm run test` | Run all tests |
| `npm run test:unit` | Run unit tests (Jest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run lint` | Lint TypeScript files |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |

### Quick Start with Makefile

From the project root:

```bash
make dev  # Equivalent to: cd phaser && npm run dev
```

## 📦 Building & Distribution

### Web Build

```bash
cd phaser
npm run build
```

Output: `phaser/dist/`

### Desktop Build (Electron)

Build for all platforms:
```bash
cd phaser
npm run electron:build:all
```

Build for specific platform:
```bash
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

Output: `phaser/dist-electron/`

### Steam Build

Steam configuration files are located in `phaser/steam_config/`:
- `app_build.vdf` - Main build configuration
- `depot_build_win.vdf` - Windows depot
- `depot_build_mac.vdf` - macOS depot
- `depot_build_linux.vdf` - Linux depot

Output: `phaser/dist-steam/`

## 🧪 Testing

### Unit Tests

```bash
cd phaser
npm run test:unit
```

Uses **Jest** with TypeScript support. Test files are located alongside source files with `.test.ts` extension.

### End-to-End Tests

```bash
npm run test:e2e        # Run tests headless
npm run test:e2e:ui     # Run with Playwright UI
npm run test:e2e:debug  # Run in debug mode
```

Uses **Playwright** for browser automation. Tests are in `phaser/e2e/`.

## 🏗️ Architecture

### Game Scenes

The game uses Phaser's scene system to manage different game states:

1. **Core** - Initialization and asset loading
2. **TitleScene** - Main menu, new game, continue game
3. **BattlegroundScene** - Main gameplay, combat, and unit management
4. **OptionsScene** - Settings and configuration
5. **DebugScene** - Development tools (dev mode only)

### State Management

- **State.ts** - Global game state (current phase, round, resources)
- **Board.ts** - Game board and unit positioning
- **SavedGame.ts** - Serialization and persistence
- **OptionsStore.ts** - User preferences and settings
- **GhostStore.ts** - Multiplayer ghost data

### Storage System

The game supports multiple storage backends:
- **localStorage** - Web browser storage
- **Steam Cloud** - Steam cloud saves (Electron build)

Located in `src/Storage/`, the storage factory pattern allows seamless switching between storage providers.

### Effects & Triggers

- **Effects/** - Gameplay effects (buffs, debuffs, abilities)
- **TriggerSystem/** - Event-driven game logic
- **Components/** - Reusable game object behaviors

### UI System

- **UI/components/** - Reusable UI components (buttons, panels, menus)
- **UI/UI.ts** - UI manager and layout
- **UI/events.ts** - UI event bus

## 🎮 Steam Integration

### Features

- **Achievements** - Tracked via `AchievementSystem.ts`
- **Cloud Saves** - Automatic save synchronization
- **Steam Overlay** - In-game Steam overlay support

### Configuration

- **steam_appid.txt** - Steam App ID for development
- **steamworks.js** - Steam API integration library

### Development

To test Steam features locally:
1. Install the Steam client
2. Ensure `steam_appid.txt` contains your App ID
3. Run the Electron build: `npm run electron:dev`

## 🛠️ Technology Stack

### Core
- **Phaser 3** (v3.88.2) - Game engine
- **TypeScript** (v5.4.5) - Programming language
- **Electron** (v36.2.1) - Desktop wrapper

### Build Tools
- **Webpack** (v5.91.0) - Module bundler
- **Babel** (v7.24.5) - JavaScript compiler
- **ESLint** - Code linting
- **Prettier** - Code formatting

### Libraries
- **phaser3-rex-plugins** - UI and effects plugins
- **steamworks.js** - Steam API bindings
- **delaunator** - Delaunay triangulation
- **easystarjs** - Pathfinding
- **uuid** - Unique ID generation

### Testing
- **Jest** - Unit testing
- **Playwright** - E2E testing

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](phaser/LICENSE) file for details.

## 🔗 Links

- **Repository:** https://github.com/lfarroco/mana-game
- **Issues:** https://github.com/lfarroco/mana-game/issues
- **Author:** Mana Battle Team <redacted@example.com>

---

**Happy Gaming! 🎮**
