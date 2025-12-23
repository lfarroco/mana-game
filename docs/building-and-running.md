# Building and Running

## Quick Start

```bash
cd phaser
npm install
npm run dev
```

Opens at `http://localhost:8080`

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production web build |
| `npm run electron:dev` | Run desktop app in development mode |
| `npm run electron:build:all` | Build desktop app for all platforms (Windows, macOS, Linux) |
| `npm run test` | Run all tests |

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
npm run electron:build:all
```

Builds standalone executables for:
- Windows (`.exe`)
- macOS (`.dmg`)
- Linux (`.AppImage`)

Build outputs are placed in the `dist-electron` directory.

## Platform Requirements

- **Node.js**: v16 or higher
- **npm**: v7 or higher
- **OS**: Windows, macOS, or Linux
