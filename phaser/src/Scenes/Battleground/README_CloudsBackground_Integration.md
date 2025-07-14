# CloudsBackground Integration in Battleground Scene

The `BattlegroundSetupSystem` has been updated to use the `CloudsBackground` component instead of a static forest background image.

## Changes Made

### BattlegroundSetupSystem.ts

1. **Import Added**: Added import for `CloudsBackground` component
2. **Property Added**: Added private `cloudsBackground` property to store the component instance
3. **setupSceneElements Updated**: Replaced static image creation with CloudsBackground component
4. **destroy Method Added**: Added cleanup method to properly destroy the background component

### BattlegroundScene.ts

1. **Cleanup Updated**: Added call to `setupSystem.destroy()` in the cleanup method

## Current Configuration

The battleground now uses these settings for the animated background:

```typescript
new CloudsBackground(this.scene, {
    preset: 'forest',           // Use forest preset to match the original theme
    depth: -2000,              // Ensure it's behind everything else
    autoChangePresets: false   // Keep it stable for gameplay
});
```

## Customization Options

You can easily customize the battleground background by modifying the configuration in `BattlegroundSetupSystem.setupSceneElements()`:

### Different Color Themes

```typescript
// Ocean theme for water levels
new CloudsBackground(this.scene, {
    preset: 'sea',
    depth: -2000,
    autoChangePresets: false
});

// Mystical aurora for magical battles
new CloudsBackground(this.scene, {
    preset: 'aurora',
    depth: -2000,
    autoChangePresets: false
});

// Dramatic sunset for boss battles
new CloudsBackground(this.scene, {
    preset: 'sunset',
    depth: -2000,
    autoChangePresets: false
});
```

### Dynamic Backgrounds

```typescript
// Auto-changing background for variety
new CloudsBackground(this.scene, {
    preset: 'nebula',
    depth: -2000,
    autoChangePresets: true,
    presetChangeInterval: 10000 // Change every 10 seconds
});
```

### Custom Colors

```typescript
// Unique color scheme for special events
new CloudsBackground(this.scene, {
    customColors: {
        color1: { x: 0.1, y: 0.05, z: 0.2 },   // Dark blue
        color2: { x: 0.2, y: 0.1, z: 0.4 },    // Medium blue
        color3: { x: 0.5, y: 0.3, z: 0.7 },    // Light blue
        color4: { x: 0.8, y: 0.6, z: 0.2 },    // Golden highlights
        color5: { x: 1.0, y: 0.9, z: 0.9 }     // White clouds
    },
    depth: -2000,
    autoChangePresets: false
});
```

### Subtle Background

```typescript
// More subtle background that doesn't distract from gameplay
new CloudsBackground(this.scene, {
    preset: 'forest',
    depth: -2000,
    alpha: 0.6,               // Semi-transparent
    autoChangePresets: false
});
```

## Implementation Details

### Compatibility

The CloudsBackground shader is stored as `this.scene.bgImage` for compatibility with existing code that might reference this property. The type casting `as any` is used because the shader object doesn't exactly match the `Phaser.GameObjects.Image` interface, but it provides the necessary functionality.

### Container Management

The background shader is added to `this.scene.bgContainer` to maintain the existing container structure, allowing other systems that manipulate the background container to continue working.

### Performance

The shader-based background is more performance-efficient than particle systems or multiple image layers, while providing rich visual effects that enhance the game's atmosphere.

## Future Enhancements

Potential future improvements could include:

1. **Dynamic Background Selection**: Choose background based on current round, difficulty, or player progress
2. **Battle State Integration**: Change background intensity during combat vs. shop phases
3. **Preset Transitions**: Smooth transitions between different color presets
4. **Interactive Elements**: Background responding to player actions or battle events

## Testing

To test the new background:

1. Start the game and enter the battleground scene
2. The animated clouds background should be visible behind all game elements
3. The background should automatically clean up when leaving the scene
4. No performance impact should be noticeable compared to the previous static image

## Reverting (if needed)

If you need to revert to the static forest background, replace the CloudsBackground creation in `setupSceneElements()` with:

```typescript
this.scene.bgImage = this.scene.add.image(
    0, 0,
    images.bg_forest.key,
).setDisplaySize(constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
    .setPosition(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);
```

And remove the CloudsBackground import and related code.
