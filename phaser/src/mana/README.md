# Mana - Reactive Rendering Library for Phaser

A declarative, reactive library for managing Phaser game objects with an Elm-like architecture.

## Features

- **Declarative Components**: Describe what you want, not how to create it
- **Reactive State**: Automatic updates when state changes
- **Message-Based Events**: Type-safe event handling
- **Extensible Architecture**: Easy to add new component types and properties
- **Type-Safe**: Full TypeScript support
- **Modular Design**: Clean separation of concerns

## Quick Start

```typescript
import {
  createComponentState,
  setData,
  Element,
  ComponentState
} from './mana';

// Define your message types
type GameMsg =
  | { type: 'PLAYER_CLICKED' }
  | { type: 'SCORE_UPDATE', points: number };

// Create update function
const update = (
  msg: GameMsg,
  state: ComponentState<GameMsg>
): ComponentState<GameMsg> => {
  switch (msg.type) {
    case 'SCORE_UPDATE':
      // Update game state
      return state;
    default:
      return state;
  }
};

// Initialize in Phaser scene
const state = createComponentState(scene, update);

// Define components declaratively
const components: Element<GameMsg>[] = [
  {
    id: 'player',
    type: 'image',
    x: 100,
    y: 100,
    texture: 'player',
    interactive: true,
    onClick: () => [{ type: 'PLAYER_CLICKED' }]
  },
  {
    id: 'score',
    type: 'text',
    x: 10,
    y: 10,
    text: 'Score: 0',
    style: { fontSize: '24px', color: '#ffffff' }
  }
];

// Render components
setData(components)(state);
```

## Component Types

### Built-in Types

#### Image
```typescript
{
  id: 'my-image',
  type: 'image',
  x: 100,
  y: 100,
  texture: 'my-texture',
  visible: true,
  alpha: 1.0,
  rotation: 0,
  scale: { x: 1, y: 1 },
  interactive: true,
  onClick: (pointer) => [{ type: 'CLICKED' }]
}
```

#### Text
```typescript
{
  id: 'my-text',
  type: 'text',
  x: 50,
  y: 50,
  text: 'Hello World',
  style: {
    fontSize: '24px',
    color: '#ffffff',
    fontFamily: 'Arial'
  }
}
```

#### Container
```typescript
{
  id: 'my-container',
  type: 'container',
  x: 0,
  y: 0,
  children: [
    // Other components...
  ]
}
```

## Extending the Library

### Adding Custom Properties

```typescript
import { registerPropertySetter } from './mana';

// Add tint property
registerPropertySetter('tint', (obj, val) => {
  if ('setTint' in obj && typeof val === 'number') {
    obj.setTint(val);
  }
});

// Add depth property
registerPropertySetter('depth', (obj, val) => {
  if ('setDepth' in obj && typeof val === 'number') {
    obj.setDepth(val);
  }
});

// Now all components can use these properties
const components = [
  {
    id: 'background',
    type: 'image',
    x: 0,
    y: 0,
    texture: 'bg',
    tint: 0xff0000,
    depth: -1
  }
];
```

```typescript
import { registerPropertySetter } from './mana';

// Add tint property
registerPropertySetter('tint', (obj, val) => {
  if ('setTint' in obj && typeof val === 'number') {
    obj.setTint(val);
  }
});

// Add depth property
registerPropertySetter('depth', (obj, val) => {
  if ('setDepth' in obj && typeof val === 'number') {
    obj.setDepth(val);
  }
});

// Now all components can use these properties
const components = [
  {
    id: 'background',
    type: 'image',
    x: 0,
    y: 0,
    texture: 'bg',
    tint: 0xff0000,
    depth: -1
  }
];
```

### Adding Custom Update Logic

```typescript
import { registerUpdateHandler } from './mana';

// Custom update for sprites
registerUpdateHandler('sprite', (gameObject, data, state) => {
  const sprite = gameObject as Phaser.GameObjects.Sprite;
  const spriteData = data as any;

  // Update animation if changed
  if (spriteData.animation && sprite.anims.currentAnim?.key !== spriteData.animation) {
    sprite.play(spriteData.animation);
  }

  // Update tint if specified
  if (spriteData.tint !== undefined) {
    sprite.setTint(spriteData.tint);
  }
});
```

### Adding Cleanup Hooks

```typescript
import { registerCleanupHook } from './mana';

// Custom cleanup logic
registerCleanupHook((state) => {
  console.log('Cleaning up custom resources');
  // Stop all animations, clear custom caches, etc.
});
```

## Advanced Usage

### Message Processing

```typescript
// Subscribe to all messages
subscribe((msg) => {
  console.log('Message received:', msg);
})(state);

// Manually enqueue messages
enqueueMessages([{ type: 'CUSTOM_EVENT' }])(state);
```

### Conditional Rendering

```typescript
const components = [
  gameState.player.health > 0 && {
    id: 'player',
    type: 'image',
    x: gameState.player.x,
    y: gameState.player.y,
    texture: 'player'
  },
  gameState.showUI && {
    id: 'ui-panel',
    type: 'container',
    x: 0,
    y: 0,
    children: [/* UI components */]
  }
].filter(Boolean); // Remove falsy values
```

### List Rendering

```typescript
const enemyComponents = gameState.enemies.map((enemy, index) => ({
  id: `enemy-${index}`,
  type: 'image',
  x: enemy.x,
  y: enemy.y,
  texture: 'enemy',
  onClick: () => [{ type: 'ENEMY_CLICKED', id: enemy.id }]
}));
```

### Component Composition

```typescript
const createButton = (
  id: string,
  x: number,
  y: number,
  text: string,
  onClick: () => GameMsg[]
): Element<GameMsg> => ({
  id,
  type: 'container',
  x,
  y,
  children: [
    {
      id: `${id}-bg`,
      type: 'image',
      x: 0,
      y: 0,
      texture: 'button-bg',
      interactive: true,
      onClick
    },
    {
      id: `${id}-text`,
      type: 'text',
      x: 0,
      y: 0,
      text,
      style: { fontSize: '16px', color: '#000000' }
    }
  ]
});
```

## API Reference

### State Management
- `createComponentState(scene, update?)` - Initialize the system
- `enqueueMessages(messages)` - Add messages to queue
- `subscribe(callback)` - Listen to messages
- `processMessages(state)` - Process queued messages
- `getData(state)` - Get current component data

### Rendering
- `setData(components)` - Update component tree
- `registerUpdateHandler(type, handler)` - Add custom update logic

### Component Factories
- `createImage(state, data)` - Create image component
- `createText(state, data)` - Create text component
- `createContainer(state, data)` - Create container component
- `createComponent(state, data)` - Create component by type (supports image, text, container)

### Properties
- `registerPropertySetter(property, setter)` - Add custom property
- `applyBaseProps(gameObject, data, state)` - Apply properties manually

### Lifecycle
- `destroy(state)` - Clean up the system
- `registerCleanupHook(hook)` - Add custom cleanup logic

## Architecture

The library is organized into focused modules:

```
mana/
├── index.ts      - Public API
├── types.ts      - Type definitions
├── state.ts      - State management
├── properties.ts - Property handlers
├── factories.ts  - Component creation
├── renderer.ts   - Rendering logic
└── lifecycle.ts  - Cleanup management
```

Each module has a single responsibility and can be extended through registry patterns.

## Performance Tips

1. **Stable IDs**: Don't generate new IDs on each render
2. **Minimal Updates**: Only update changed components
3. **Batch Messages**: Enqueue multiple messages at once
4. **Event Deduplication**: Handlers are attached once per component
5. **Cleanup**: Always call `destroy()` when done

## TypeScript Support

The library is fully typed with TypeScript:

```typescript
// Type-safe messages
type MyMsg = { type: 'ACTION'; payload: string };

// Type-safe components
type MyComponent = Element<MyMsg>;

// Type-safe state
type MyState = ComponentState<MyMsg>;
```

## Examples

See `examples.ts` for comprehensive examples of extending the library with custom components, properties, and handlers.

## License

MIT