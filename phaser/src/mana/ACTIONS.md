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

### TweenAction

Creates smooth animations that dispatch messages during updates and on completion.

```typescript
import { createTween, redrawShape } from './mana';

// Animate color change from 0 to 1, then use that value to interpolate colors
const tweenAction = createTween<MyMsg>(
  'color-tween-1', // unique tween ID
  0,               // from value
  1,               // to value
  500,             // duration in ms
  {
    ease: 'Power2',
    onUpdate: (t) => {
      // t goes from 0 to 1
      // Interpolate color and return redraw action
      const r = Math.round(74 + (45 - 74) * t);   // 0x4a -> 0x2d
      const g = Math.round(85 + (55 - 85) * t);   // 0x55 -> 0x37
      const b = Math.round(104 + (72 - 104) * t); // 0x68 -> 0x48
      const color = (r << 16) | (g << 8) | b;
      
      return [redrawShape('my-button', { fillColor: color })];
    },
    onComplete: () => {
      return [{ type: 'ANIMATION_COMPLETE' }];
    },
  }
);

// Stop a running tween
import { stopTween } from './mana';
const stopAction = stopTween('color-tween-1');
```

## Helper Functions

Convenient shortcuts for common operations:

```typescript
import { setFillColor, setVisible, moveTo, createTween, stopTween } from './mana';

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

## Tween Example: Smooth Color Animation

```typescript
import { 
  createComponent, 
  ManaMsg, 
  handleManaMsg,
  createTween,
  redrawShape,
  RoundedRectangleElement
} from './mana';

type ButtonMsg = 
  | ManaMsg
  | { type: 'BUTTON_CLICKED' };

const update = (msg: ButtonMsg, state) => {
  const newState = handleManaMsg(msg, state);
  if (newState !== state) return newState;

  switch (msg.type) {
    case 'BUTTON_CLICKED':
      console.log('Button clicked!');
      return state;
    default:
      return state;
  }
};

// Create button with smooth color tween on hover
const button: RoundedRectangleElement<ButtonMsg> = {
  id: 'animated-button',
  type: 'roundrect',
  x: 400,
  y: 300,
  width: 200,
  height: 50,
  radius: 8,
  fillColor: 0x4a5568,
  interactive: true,
  onClick: () => [{ type: 'BUTTON_CLICKED' }],
  onHover: () => {
    // Create smooth color tween from current (light) to hover (dark)
    const normalColor = 0x4a5568;
    const hoverColor = 0x2d3748;
    
    // Extract RGB components for interpolation
    const fromR = (normalColor >> 16) & 0xff;
    const fromG = (normalColor >> 8) & 0xff;
    const fromB = normalColor & 0xff;
    
    const toR = (hoverColor >> 16) & 0xff;
    const toG = (hoverColor >> 8) & 0xff;
    const toB = hoverColor & 0xff;
    
    return [
      createTween<ButtonMsg>(
        'button-hover-tween',
        0,
        1,
        200,
        {
          ease: 'Power2',
          onUpdate: (t) => {
            // Interpolate RGB components
            const r = Math.round(fromR + (toR - fromR) * t);
            const g = Math.round(fromG + (toG - fromG) * t);
            const b = Math.round(fromB + (toB - fromB) * t);
            const color = (r << 16) | (g << 8) | b;
            
            // Return redraw action with interpolated color
            return [redrawShape('animated-button', { fillColor: color })];
          },
        }
      ),
    ];
  },
  onHoverOut: () => {
    // Tween back to normal color
    const normalColor = 0x4a5568;
    const hoverColor = 0x2d3748;
    
    const fromR = (hoverColor >> 16) & 0xff;
    const fromG = (hoverColor >> 8) & 0xff;
    const fromB = hoverColor & 0xff;
    
    const toR = (normalColor >> 16) & 0xff;
    const toG = (normalColor >> 8) & 0xff;
    const toB = normalColor & 0xff;
    
    return [
      createTween<ButtonMsg>(
        'button-hover-out-tween',
        0,
        1,
        200,
        {
          ease: 'Power2',
          onUpdate: (t) => {
            const r = Math.round(fromR + (toR - fromR) * t);
            const g = Math.round(fromG + (toG - fromG) * t);
            const b = Math.round(fromB + (toB - fromB) * t);
            const color = (r << 16) | (g << 8) | b;
            
            return [redrawShape('animated-button', { fillColor: color })];
          },
        }
      ),
    ];
  },
};

const render = createComponent(scene, update);
render([button]);
```

## Complex Tween Example: Pulse Animation

```typescript
import { createTween, updateElement } from './mana';

// Create pulsing scale animation
const startPulse = (elementId: string) => [
  createTween<MyMsg>(
    `pulse-${elementId}`,
    1.0,  // from scale
    1.2,  // to scale
    500,  // duration
    {
      ease: 'Sine.easeInOut',
      onUpdate: (scale) => [
        updateElement(elementId, { scale: { x: scale, y: scale } })
      ],
      onComplete: () => [
        // Reverse tween back to normal
        createTween<MyMsg>(
          `pulse-${elementId}-reverse`,
          1.2,
          1.0,
          500,
          {
            ease: 'Sine.easeInOut',
            onUpdate: (scale) => [
              updateElement(elementId, { scale: { x: scale, y: scale } })
            ],
            onComplete: () => [
              // Loop by starting again
              ...startPulse(elementId)
            ],
          }
        ),
      ],
    }
  ),
];

// Start the pulse animation
render([
  // ... your elements
]);

// Trigger pulse on some event
const onItemCollected = () => startPulse('collected-item-icon');
```

## Benefits

1. **Declarative Animations**: Tweens are declared as data, not imperative code
2. **Message Integration**: Tween callbacks dispatch messages, keeping everything in the same system
3. **Consistency**: Standard way to update elements and create animations across your app
4. **Type Safety**: Actions and tweens are fully typed with TypeScript
5. **Composability**: Easy to combine with custom message types
6. **Testability**: Actions are pure data, easy to test
7. **Debugging**: Clear action trail in message queue
8. **Less Boilerplate**: Helper functions reduce repetitive code
9. **Tween Management**: Tweens are tracked by ID, easy to stop/cancel

## Notes

- Actions are processed by `handleManaMsg` in your update function
- Actions operate on elements by their ID
- Failed actions log warnings but don't throw errors
- Tweens with the same ID will automatically replace existing tweens
- Use `stopTween(id)` to cancel a running animation
- Tween `onUpdate` and `onComplete` handlers return arrays of messages
- Messages from tween callbacks are processed immediately for smooth updates
- The button component uses direct drawing for optimal performance
- For very high-frequency updates, direct drawing may be more performant than actions

## See Also

- [Types Documentation](./types.ts) - Element type definitions
- [Shape Elements](./SHAPE_ELEMENTS.md) - Shape element types
- [Button Component](./components/manabutton.ts) - Example usage
