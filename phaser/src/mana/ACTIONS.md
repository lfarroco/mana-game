# Mana Actions System

The Mana library includes a built-in action system for common operations like redrawing shapes and updating element properties. This reduces boilerplate and provides a consistent way to manipulate elements.

## Overview

The `ManaMsg` type contains built-in actions that can be composed with your custom message types:

```typescript
import { ManaMsg } from './mana';

// Compose with your custom messages
type MyMsg = ManaMsg | { type: 'CUSTOM_ACTION'; payload: string };
```

## Built-in Actions

### RedrawShapeAction

Redraws a shape element (rect, roundrect, circle, ellipse) with new properties.

```typescript
import { redrawShape } from './mana';

// Update fill color
const action = redrawShape('my-rect-id', {
  fillColor: 0xff0000,
});

// Update multiple properties
const action = redrawShape('my-button-bg', {
  fillColor: 0x4a5568,
  fillAlpha: 0.8,
  strokeColor: 0x2d3748,
  strokeWidth: 2,
});

// For rounded rectangles and circles, you can also update dimensions
const action = redrawShape('my-circle', {
  radius: 75,
  fillColor: 0x00ff00,
});
```

### UpdateElementAction

Updates common game object properties like position, visibility, and scale.

```typescript
import { updateElement } from './mana';

// Move an element
const action = updateElement('my-sprite-id', {
  x: 200,
  y: 150,
});

// Change visibility and alpha
const action = updateElement('my-text-id', {
  visible: true,
  alpha: 0.5,
});

// Rotate and scale
const action = updateElement('my-container-id', {
  rotation: Math.PI / 4,
  scale: { x: 1.5, y: 1.5 },
});
```

## Helper Functions

Convenient shortcuts for common operations:

```typescript
import { setFillColor, setVisible, moveTo } from './mana';

// Change fill color
const action = setFillColor('my-rect', 0xff0000);

// Toggle visibility
const action = setVisible('my-sprite', false);

// Move to position
const action = moveTo('my-button', 400, 300);
```

## Usage Pattern

### 1. Define Your Message Type

```typescript
import { ManaMsg } from './mana';

type GameMsg = 
  | ManaMsg  // Include built-in actions
  | { type: 'PLAYER_CLICKED'; player: string }
  | { type: 'SCORE_UPDATE'; points: number };
```

### 2. Handle Messages in Update Function

```typescript
import { handleManaMsg } from './mana';

const update = (msg: GameMsg, state: ComponentState<GameMsg>) => {
  // Handle built-in Mana messages first
  const newState = handleManaMsg(msg, state);
  if (newState !== state) {
    return newState; // Message was handled by Mana
  }

  // Handle your custom messages
  switch (msg.type) {
    case 'PLAYER_CLICKED':
      console.log('Player clicked:', msg.player);
      return state;
      
    case 'SCORE_UPDATE':
      // Update score display, etc.
      return state;
      
    default:
      return state;
  }
};
```

### 3. Dispatch Actions from Event Handlers

```typescript
import { redrawShape } from './mana';

const button: RoundedRectangleElement<GameMsg> = {
  id: 'my-button',
  type: 'roundrect',
  // ... other properties
  onHover: () => [
    // Return Mana action to change color on hover
    redrawShape('my-button', { fillColor: 0x2d3748 })
  ],
  onHoverOut: () => [
    // Return action to restore original color
    redrawShape('my-button', { fillColor: 0x4a5568 })
  ],
};
```

## Complete Example

```typescript
import { 
  createComponent, 
  ManaMsg, 
  handleManaMsg,
  redrawShape,
  moveTo,
  RoundedRectangleElement,
  TextElement
} from './mana';

// Define message types
type MenuMsg = 
  | ManaMsg
  | { type: 'START_GAME' }
  | { type: 'OPEN_SETTINGS' };

// Create update function
const update = (msg: MenuMsg, state: ComponentState<MenuMsg>) => {
  // Handle Mana actions
  const newState = handleManaMsg(msg, state);
  if (newState !== state) return newState;

  // Handle custom actions
  switch (msg.type) {
    case 'START_GAME':
      console.log('Starting game...');
      return state;
      
    case 'OPEN_SETTINGS':
      console.log('Opening settings...');
      return state;
      
    default:
      return state;
  }
};

// Create interactive button
const createMenuButton = (
  id: string,
  x: number,
  y: number,
  text: string,
  action: MenuMsg
): readonly Element<MenuMsg>[] => {
  const normalColor = 0x4a5568;
  const hoverColor = 0x2d3748;

  return [
    {
      id,
      type: 'container',
      x,
      y,
      children: [
        {
          id: `${id}-bg`,
          type: 'roundrect',
          x: 0,
          y: 0,
          width: 200,
          height: 50,
          radius: 8,
          fillColor: normalColor,
          interactive: true,
          onClick: () => [action],
          onHover: () => [
            redrawShape(`${id}-bg`, { fillColor: hoverColor })
          ],
          onHoverOut: () => [
            redrawShape(`${id}-bg`, { fillColor: normalColor })
          ],
        } as RoundedRectangleElement<MenuMsg>,
        {
          id: `${id}-text`,
          type: 'text',
          x: 0,
          y: 0,
          text,
          style: { fontSize: '16px', color: '#ffffff' },
        } as TextElement<MenuMsg>,
      ],
    },
  ];
};

// Initialize in scene
const render = createComponent(scene, update);

render([
  ...createMenuButton('start-btn', 400, 200, 'Start Game', { type: 'START_GAME' }),
  ...createMenuButton('settings-btn', 400, 270, 'Settings', { type: 'OPEN_SETTINGS' }),
]);
```

## Advanced: Animations with Actions

You can dispatch actions during tweens for smooth animations:

```typescript
import { enqueueMessages, redrawShape } from './mana';

// In your component state
let componentState: ComponentState<MyMsg>;

// Create a tween that dispatches actions
scene.tweens.addCounter({
  from: 0,
  to: 1,
  duration: 1000,
  onUpdate: (tween) => {
    const t = tween.getValue();
    const color = interpolateColor(startColor, endColor, t);
    
    // Dispatch action to update color
    const action = redrawShape('my-element', { fillColor: color });
    componentState = enqueueMessages([action])(componentState);
  },
});
```

## Benefits

1. **Consistency**: Standard way to update elements across your app
2. **Type Safety**: Actions are fully typed with TypeScript
3. **Composability**: Easy to combine with custom message types
4. **Testability**: Actions are pure data, easy to test
5. **Debugging**: Clear action trail in message queue
6. **Less Boilerplate**: Helper functions reduce repetitive code

## Notes

- Actions are processed by `handleManaMsg` in your update function
- Actions operate on elements by their ID
- Failed actions log warnings but don't throw errors
- The button component uses direct drawing for performance, but exports ManaMsg utilities for other components
- For high-frequency updates (like smooth animations), consider direct drawing instead of actions for better performance

## See Also

- [Types Documentation](./types.ts) - Element type definitions
- [Shape Elements](./SHAPE_ELEMENTS.md) - Shape element types
- [Button Component](./components/manabutton.ts) - Example usage
