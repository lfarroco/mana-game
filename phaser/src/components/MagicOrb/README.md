# Magic Orb Shader Component

A customizable magic orb component for Phaser games that displays a magical orb with swirling arcane clouds/waves inside using WebGL shaders.

## Features

- **Customizable size**: Create orbs of any size (e.g., 100x100, 200x200)
- **Dynamic colors**: Change orb colors in real-time
- **Animated magic effects**: Swirling clouds, pulsing intensity, and sparkle effects
- **Performance optimized**: Uses WebGL shaders for smooth animations
- **Easy integration**: Simple API for use in Phaser scenes

## Usage

### Basic Usage

```typescript
import { MagicOrb, MagicOrbFactory } from "../../components/MagicOrb/MagicOrb";

// In your Phaser scene's create() method:
const orb = new MagicOrb(this, 400, 300, {
    size: 150,
    color: [0.5, 0.3, 1.0], // Purple color (RGB values 0-1)
    intensity: 1.2,
    speed: 1.0
});

// Don't forget to update the orb in your scene's update() method:
update(time: number) {
    orb.update(time);
}
```

### Using the Factory (Pre-configured Colors)

```typescript
// Create pre-configured orbs with different colors:
const purpleOrb = MagicOrbFactory.createPurpleOrb(this, 200, 200, 100);
const blueOrb = MagicOrbFactory.createBlueOrb(this, 400, 200, 100);
const redOrb = MagicOrbFactory.createRedOrb(this, 600, 200, 100);
const greenOrb = MagicOrbFactory.createGreenOrb(this, 800, 200, 100);
const goldenOrb = MagicOrbFactory.createGoldenOrb(this, 1000, 200, 100);
```

### Dynamic Property Changes

```typescript
// Change color dynamically
orb.setOrbColor(1.0, 0.0, 0.0); // Red

// Change intensity
orb.setIntensity(1.5);

// Change animation speed
orb.setSpeed(2.0);

// Resize the orb
orb.setSize(200);

// Change position
orb.setPosition(500, 400);

// Set depth for layering
orb.setDepth(10);

// Set transparency
orb.setAlpha(0.8);
```

### Integration Example (TitleScene)

```typescript
export default class TitleScene extends Phaser.Scene {
    private magicOrbs: MagicOrb[] = [];

    create() {
        // Create magic orbs for visual flair
        const orb1 = MagicOrbFactory.createPurpleOrb(this, 150, 200, 100);
        const orb2 = MagicOrbFactory.createBlueOrb(this, this.scale.width - 150, 300, 80);
        
        this.magicOrbs = [orb1, orb2];
        
        // Set depths to appear behind UI
        this.magicOrbs.forEach((orb, index) => {
            orb.setDepth(-50 + index);
        });
    }

    update(time: number) {
        this.magicOrbs.forEach(orb => {
            orb.update(time);
        });
    }

    destroy() {
        this.magicOrbs.forEach(orb => {
            orb.destroy();
        });
        this.magicOrbs = [];
    }
}
```

## Configuration Options

| Property    | Type                     | Default         | Description                              |
|-------------|--------------------------|-----------------|------------------------------------------|
| `size`      | number                   | 100             | Size of the orb in pixels                |
| `color`     | [number, number, number] | [0.5, 0.3, 1.0] | RGB color values (0-1)                   |
| `intensity` | number                   | 1.0             | Brightness/intensity of the magic effect |
| `speed`     | number                   | 1.0             | Animation speed multiplier               |

## Shader Details

The magic orb uses a custom fragment shader that creates:

- **Fractal noise clouds**: Multiple layers of animated noise for organic cloud movement
- **Swirling motion**: Time-based rotation that's stronger towards the center
- **Radial gradient**: Depth effect from center to edges
- **Pulsing animation**: Subtle breathing effect
- **Rim lighting**: Glowing edges for better definition
- **Sparkle effects**: Random bright spots for magical feeling
- **Circular masking**: Clean circular shape with soft edges

## Performance Notes

- Each orb runs its own shader, so use moderately (5-10 orbs should be fine)
- The shader is optimized for mobile and desktop performance
- Consider reducing the number of orbs on lower-end devices
- Use depth layering to create visual hierarchy

## Cleanup

Always call `orb.destroy()` when removing orbs or changing scenes to prevent memory leaks:

```typescript
// Clean up when scene ends
this.magicOrbs.forEach(orb => orb.destroy());
```
