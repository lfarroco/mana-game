# Steam Upload Guide

This guide covers how to build and upload both the **full game** and **demo version** to Steam.

---

## Prerequisites

1. **Install SteamCMD**
   - Download from: https://developer.valvesoftware.com/wiki/SteamCMD
   - Make sure `steamcmd` is in your PATH

2. **Steam Partner Account**
   - Access to Steamworks
   - Proper permissions for both apps

3. **App IDs**
   - Full Game: `3757600`
   - Demo: `4233280`

---

## Building for Steam

### Full Game

```bash
# Build for all platforms
npm run electron:build:all

# Or build for specific platform
npm run electron:build:win
npm run electron:build:mac
npm run electron:build:linux
```

### Demo Version

```bash
# Build demo for all platforms
IS_DEMO=true npm run build && IS_DEMO=true electron-builder --win --mac --linux

# Or build for specific platform
npm run electron:build:demo:win
npm run electron:build:demo:mac
npm run electron:build:demo:linux
```

**Important**: Always build with `IS_DEMO=true` for the demo version!

---

## Uploading to Steam

### Full Game Upload

```bash
npm run publish:steam
```

Or directly:
```bash
./steam/scripts/publish_steam.sh
```

### Demo Upload

```bash
npm run publish:steam:demo
```

Or directly:
```bash
./steam/scripts/publish_steam_demo.sh
```

---

## Steam Configuration Files

### Full Game
- **App Build**: `steam_config/app_build.vdf`
- **Depots**:
  - Windows: `steam_config/depot_build_win.vdf` (Depot ID: 3757602)
  - macOS: `steam_config/depot_build_mac.vdf` (Depot ID: 3757604)
  - Linux: `steam_config/depot_build_linux.vdf` (Depot ID: 3757603)
- **App ID File**: `steam_appid.txt`

### Demo
- **App Build**: `steam_config/app_build_demo.vdf`
- **Depots**:
  - Windows: `steam_config/depot_build_demo_win.vdf` (Depot ID: 4233282)
  - macOS: `steam_config/depot_build_demo_mac.vdf` (Depot ID: 4233284)
  - Linux: `steam_config/depot_build_demo_linux.vdf` (Depot ID: 4233283)
- **App ID File**: `steam_appid_demo.txt`

---

## Complete Workflow

### Publishing Full Game

1. **Build the game**:
   ```bash
   npm run electron:build:all
   ```

2. **Test locally** (optional but recommended):
   ```bash
   npm run electron:dev
   ```

3. **Upload to Steam**:
   ```bash
   npm run publish:steam
   ```
   - Enter your Steam username when prompted
   - Enter password and 2FA code if required

4. **Verify on Steamworks**:
   - Go to Steamworks Partner site
   - Check the build appears in your depot
   - Set the build live if ready

### Publishing Demo

1. **Build the demo**:
   ```bash
   npm run electron:build:demo:win
   npm run electron:build:demo:mac
   npm run electron:build:demo:linux
   ```

2. **Test locally** (IMPORTANT!):
   ```bash
   IS_DEMO=true npm run electron:dev
   ```
   
   Verify:
   - ✅ No units unlock
   - ✅ No achievements trigger
   - ✅ Game stops at 5 victories
   - ✅ "Demo Complete" message appears
   - ✅ "Buy Full Game" button works

3. **Upload to Steam**:
   ```bash
   npm run publish:steam:demo
   ```

4. **Verify on Steamworks**:
   - Check demo app (4233280)
   - Verify build appears
   - Set live when ready

---

## Troubleshooting

### Build not found
- Make sure you ran the build command first
- Check that `dist-electron` directory exists
- Verify the correct platforms were built

### SteamCMD login issues
- Use your Steam account credentials
- You may need to enter a 2FA code
- For automation, see SteamCMD documentation on guard codes

### Wrong version uploaded
- **Full game**: Make sure you didn't build with `IS_DEMO=true`
- **Demo**: Make sure you built with `IS_DEMO=true`
- Check console logs for "Demo mode: true/false"

### Depot IDs don't match
- Verify depot IDs in Steamworks match the VDF files
- Full game depots: 3757602 (Win), 3757604 (Mac), 3757603 (Linux)
- Demo depots: 4233282 (Win), 4233284 (Mac), 4233283 (Linux)

---

## Environment Variables

You can set these to avoid entering credentials each time:

```bash
export STEAM_USERNAME="your_username"
```

**Warning**: Never commit passwords or guard codes to version control!

---

## Quick Reference

| Task                            | Command                             |
|---------------------------------|-------------------------------------|
| Build full game (all platforms) | `npm run electron:build:all`        |
| Build demo (all platforms)      | See "Building for Steam" section    |
| Upload full game                | `npm run publish:steam`             |
| Upload demo                     | `npm run publish:steam:demo`        |
| Test full game locally          | `npm run electron:dev`              |
| Test demo locally               | `IS_DEMO=true npm run electron:dev` |

---

## Notes

- Always test the demo build before uploading to verify the 5-victory limit works
- The demo and full game use separate Steam App IDs
- Build output goes to `dist-steam/` (full) and `dist-steam-demo/` (demo)
- Both versions are built from the same codebase using the `IS_DEMO` flag
