# Audio System

The **Audio System** manages music and sound effects in Mana Battle, providing audio feedback for game events while respecting user preferences and performance considerations.

## Overview

The audio system uses Phaser's sound management with custom logic for music looping, sound effect cooldowns, and user preference integration.

## Architecture

Located in `phaser/src/Systems/AudioManager.ts`.

### Core Features
- **Music Playback**: Background tracks with fade in/out
- **Sound Effects**: Event-triggered audio with cooldown prevention
- **User Preferences**: Respects volume and enable/disable settings
- **Error Handling**: Graceful failure for missing assets or uninitialized systems

## Music Management

### Playback Functions
- `playMusic(musicKey, loop, fadeIn)`: Start background music
- `stopMusic(fadeOut)`: Stop current music track

### Features
- **Looping**: Configurable loop behavior
- **Fade Effects**: Smooth volume transitions
- **Volume Control**: Uses `musicVolume` user setting
- **Single Track**: Only one music track plays at a time

### State Tracking
- `currentMusic`: Active Phaser sound object
- `currentMusicKey`: Identifier for currently playing track

## Sound Effects

### Playback Function
- `playSoundEffect(soundKey, volume?)`: Play one-shot sound

### Anti-Spam Protection
- **Cooldown System**: 1-second cooldown per sound effect
- **Tracking**: `soundEffectCooldowns` Map prevents rapid repetition
- **Volume Override**: Optional volume parameter for specific effects

### State Management
- `soundEffects`: Map of active sound instances
- **Automatic Cleanup**: Phaser handles sound lifecycle

## User Preferences Integration

### Settings Used
- `music`: Enable/disable background music
- `sound`: Enable/disable sound effects
- `musicVolume`: Background music volume (0-1)
- `soundVolume`: Sound effects volume (0-1)

### Integration
- `getOption()` from `OptionsStore` retrieves preferences
- Real-time application of volume changes
- Silent operation when disabled

## Error Handling

### Robustness Features
- **Sound System Check**: Verifies `game.sound` availability
- **Asset Loading**: Try-catch for missing audio files
- **Test Compatibility**: Silent failure in test environments
- **Console Logging**: Debug information without crashes

### Common Scenarios
- Missing audio assets
- Uninitialized Phaser sound system
- Browser audio restrictions
- Test environment execution

## Usage Examples

### Music Control
```typescript
import { playMusic, stopMusic } from '@Systems/AudioManager';

// Start battle music with fade in
playMusic('battle_theme', true, 1000);

// Stop with fade out
stopMusic(2000);
```

### Sound Effects
```typescript
import { playSoundEffect } from '@Systems/AudioManager';

// Play attack sound
playSoundEffect('attack_swing');

// Play with custom volume
playSoundEffect('critical_hit', 0.8);
```

## Integration Points

- **Game Events**: Combat effects, UI interactions, phase transitions
- **Options System**: Volume sliders and toggle switches
- **Asset Loading**: Audio files loaded via Phaser
- **Performance**: Cooldowns prevent audio spam
- **Accessibility**: User preference respect

## Audio Assets

### Expected File Structure
- Music: `assets/audio/music/*.mp3` or `*.ogg`
- SFX: `assets/audio/sfx/*.mp3` or `*.ogg`

### Naming Convention
- Music keys: `battle_theme`, `shop_music`, etc.
- Sound keys: `attack_swing`, `heal_effect`, `purchase_confirm`, etc.

## Performance Considerations

- **Memory Management**: Phaser handles sound cleanup
- **Cooldown Prevention**: Avoids audio queue buildup
- **Conditional Loading**: Only loads enabled audio types
- **Volume Caching**: Avoids repeated option lookups

## Future Enhancements

Potential improvements:
- **Audio Pooling**: Reuse sound instances
- **Spatial Audio**: Position-based volume
- **Dynamic Mixing**: Context-aware volume adjustment
- **Audio Groups**: Categorized volume controls