# Mana Library Examples

This directory contains runnable examples demonstrating how to use the Mana reactive rendering library with Phaser.

## Examples

### Basic Interaction Example (`basic-interaction.ts`)

A complete Phaser scene that demonstrates:

- **Interactive Components**: Image, text, and container game objects with click handlers
- **Message Handling**: How to define message types and handle them in an update function
- **State Management**: Managing game state that reacts to user interactions
- **Dynamic Updates**: Components that update based on game state changes

### Features Demonstrated

- Creating interactive image components (hero character)
- Creating interactive text components (score display)
- Creating interactive container components (UI panels)
- Message-based architecture for handling user interactions
- State-driven component updates
- Conditional rendering (panel visibility toggle)

### Using in Your Existing Scene

The easiest way to try Mana is to use the `setupBasicInteractionExample` function in your existing scene:

```typescript
import { setupBasicInteractionExample } from './src/mana/examples/basic-interaction';

export class MyGameScene extends Phaser.Scene {
  create() {
    // Add your existing game setup here...

    // Then add the Mana example
    const manaExample = setupBasicInteractionExample(this);

    // You can access the game state and update function if needed
    console.log('Initial score:', manaExample.gameState.score);
  }
}
```

### Running the Example

```typescript
import { ManaExampleScene } from './src/mana/examples/basic-interaction';

// Add to your Phaser game configuration
const config = {
  // ... other config
  scene: ManaExampleScene
};
```

Or run it standalone:

```typescript
import { createExampleGame } from './src/mana/examples/basic-interaction';

// This creates a complete Phaser game with the example scene
const game = createExampleGame();
```

### What You'll See

- A green hero image that moves when clicked
- A score text that increases when clicked
- A blue UI panel that can be toggled on/off
- Console logs showing the message handling

## Adding More Examples

To add new examples:

1. Create a new `.ts` file in this directory
2. Follow the pattern of `basic-interaction.ts`
3. Export your scene class and any helper functions
4. Update this README with documentation

## Learning Path

1. **Basic Interaction** - Start here to understand the core concepts
2. **Advanced Examples** - Add more complex interactions and state management
3. **Integration Examples** - Show how to integrate with existing Phaser games