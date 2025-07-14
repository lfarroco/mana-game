# CloudsBackground Component

A reusable animated clouds and nebula background component for Phaser 3 games, built with WebGL shaders.

## Features

- **Animated Shader Background**: Procedurally generated clouds, nebulae, and star fields
- **Multiple Color Presets**: Built-in presets (nebula, sunset, sea, forest, aurora)
- **Custom Colors**: Support for custom color schemes
- **Auto-changing Presets**: Automatically cycle through different color schemes
- **Flexible Positioning & Sizing**: Can be placed anywhere and sized as needed
- **Depth Control**: Set the rendering depth/z-index
- **Alpha/Transparency**: Control opacity
- **Easy Integration**: Simple API for any Phaser scene

## Basic Usage

```typescript
import { CloudsBackground } from '../Components/CloudsBackground';

// In your scene's create() method:
const background = new CloudsBackground(this);
```

## Configuration Options

```typescript
interface CloudsBackgroundConfig {
  preset?: 'nebula' | 'sunset' | 'sea' | 'forest' | 'aurora';
  customColors?: IColorPreset;
  x?: number;                    // X position (default: screen center)
  y?: number;                    // Y position (default: screen center)
  width?: number;                // Width (default: screen width)
  height?: number;               // Height (default: screen height)
  autoChangePresets?: boolean;   // Auto-cycle presets (default: false)
  presetChangeInterval?: number; // Interval in ms (default: 5000)
  depth?: number;                // Rendering depth (default: -1000)
  alpha?: number;                // Opacity 0-1 (default: 1)
}
```

## Examples

### Full Screen Background with Auto-changing Presets
```typescript
const background = new CloudsBackground(this, {
  preset: 'nebula',
  autoChangePresets: true,
  presetChangeInterval: 5000
});
```

### Custom Positioned Panel Background
```typescript
const panelBg = new CloudsBackground(this, {
  x: 200,
  y: 150,
  width: 400,
  height: 300,
  preset: 'sunset',
  alpha: 0.8
});
```

### Custom Colors
```typescript
const customBg = new CloudsBackground(this, {
  customColors: {
    color1: { x: 0.1, y: 0.05, z: 0.3 },   // Dark purple
    color2: { x: 0.2, y: 0.1, z: 0.6 },    // Purple
    color3: { x: 0.6, y: 0.3, z: 0.8 },    // Light blue
    color4: { x: 0.8, y: 0.6, z: 0.2 },    // Gold
    color5: { x: 1.0, y: 0.9, z: 0.9 }     // White
  }
});
```

## Methods

### changePreset()
Manually change to the next preset:
```typescript
background.changePreset();
```

### setPreset(presetName)
Set a specific preset:
```typescript
background.setPreset('aurora');
```

### setCustomColors(colors)
Set custom colors:
```typescript
background.setCustomColors({
  color1: { x: 0.2, y: 0.0, z: 0.0 },
  color2: { x: 0.6, y: 0.2, z: 0.0 },
  color3: { x: 1.0, y: 0.8, z: 0.0 },
  color4: { x: 0.8, y: 0.0, z: 0.2 },
  color5: { x: 1.0, y: 1.0, z: 1.0 }
});
```

### setAutoChange(enabled, interval?)
Enable/disable auto-changing presets:
```typescript
background.setAutoChange(true, 3000); // Change every 3 seconds
```

### setPosition(x, y)
Change position:
```typescript
background.setPosition(100, 200);
```

### setSize(width, height)
Change size:
```typescript
background.setSize(800, 600);
```

### setDepth(depth)
Change rendering depth:
```typescript
background.setDepth(-500);
```

### setAlpha(alpha)
Change opacity:
```typescript
background.setAlpha(0.5);
```

### getCurrentPresetName()
Get current preset name:
```typescript
const currentPreset = background.getCurrentPresetName();
```

### destroy()
Clean up resources:
```typescript
background.destroy();
```

## Common Use Cases

### Title Screen
```typescript
const titleBg = new CloudsBackground(this, {
  preset: 'nebula',
  autoChangePresets: true,
  presetChangeInterval: 5000
});
```

### Gameplay Background
```typescript
const gameBg = new CloudsBackground(this, {
  preset: 'forest',
  alpha: 0.3,
  depth: -2000
});
```

### Dialog/Modal Overlay
```typescript
const dialogBg = new CloudsBackground(this, {
  x: modalX,
  y: modalY,
  width: modalWidth,
  height: modalHeight,
  preset: 'aurora',
  alpha: 0.8,
  depth: 100
});
```

## Cleanup

Always destroy the background when the scene is destroyed:

```typescript
export default class MyScene extends Phaser.Scene {
  private background!: CloudsBackground;

  create() {
    this.background = new CloudsBackground(this);
    // ... rest of scene setup
  }

  destroy() {
    if (this.background) {
      this.background.destroy();
    }
  }
}
```

## Available Presets

- **nebula**: Deep space colors with purple, magenta, and cyan
- **sunset**: Warm colors with reds, oranges, and yellows  
- **sea**: Ocean colors with various shades of blue and green
- **forest**: Earth tones with greens, browns, and golden sunbeams
- **aurora**: Night sky with green, purple, and icy blue

## Integration with Existing Code

To convert existing shader usage (like in TitleScene), simply replace:

```typescript
// Old way:
const backgroundShader = new Phaser.Display.BaseShader(/* ... */);
this.shader = this.add.shader(/* ... */);

// New way:
this.cloudsBackground = new CloudsBackground(this, {
  preset: 'nebula',
  autoChangePresets: true
});
```
