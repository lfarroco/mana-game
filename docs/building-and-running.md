# Building and Running

## Quick Start

```bash
cd phaser
npm install
npm run dev
```

Opens at `http://localhost:8080`

## Available Commands

### Core

| Command                 | Description                                        |
|-------------------------|----------------------------------------------------|
| `npm run dev`           | Start development server with hot reload           |
| `npm run dev:demo`      | Start development server in demo mode              |
| `npm run build`         | Create production web build                        |
| `npm run test`          | Run all tests                                      |
| `npm run test:unit`     | Run unit tests only                                |
| `npm run test:e2e`      | Run Playwright end-to-end tests                    |
| `npm run test:mutation` | Run mutation testing (Stryker, Core-focused scope) |
| `npm run lint`          | Run ESLint                                         |
| `npm run format`        | Run Prettier formatting                            |

### Desktop (Electron)

| Command                   | Description                                                 |
|---------------------------|-------------------------------------------------------------|
| `make electron-dev`       | Run desktop app in development mode                         |
| `make electron-build`     | Build desktop app for current platform                      |
| `make electron-build-all` | Build desktop app for all platforms (Windows, macOS, Linux) |

### Mobile

| Command              | Description                     |
|----------------------|---------------------------------|
| `make android-build` | Build for Android via Capacitor |
| `make android-open`  | Open project in Android Studio  |

### Publishing

| Command                   | Description                |
|---------------------------|----------------------------|
| `make steam-publish`      | Upload build to Steam      |
| `make steam-publish-demo` | Upload demo build to Steam |

## Development Server

The development server runs on port 8080 by default and includes:
- Hot module reloading
- Source maps for debugging
- TypeScript compilation

## Building for Production

### Web Build

```bash
npm run build
```

Creates an optimized production build in the `dist` directory.

### Desktop Build

```bash
make electron-build-all
```

Builds standalone executables for:
- Windows (`.exe`)
- macOS (`.dmg`)
- Linux (`.AppImage`)

Build outputs are placed in the `dist-electron` directory.

## Platform Requirements

- **Node.js**: v22 or higher
- **npm**: v7 or higher
- **OS**: Windows, macOS, or Linux
