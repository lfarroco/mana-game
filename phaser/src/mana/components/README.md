# Mana Button Component

A fully-featured, reactive button component built with the Mana library for Phaser games.

## Features

✨ **Graphics-based rendering** - Uses Phaser Graphics for clean, scalable buttons
📝 **Text overlay** - Centered text label with customizable styling  
🎨 **Hover animations** - Smooth color transitions using Phaser tweens
🖱️ **Click handling** - Type-safe message dispatch on click
🎯 **Flexible configuration** - Extensive customization options
♻️ **Reactive updates** - Automatically updates when data changes
🧩 **Composable** - Can be nested in containers with other components

## Quick Start

```typescript
import { createButton } from './mana/components/manabutton';
import { createComponentState, setData } from './mana';

// Define your message types
type GameMsg = { type: 'START_GAME' } | { type: 'QUIT' };

// Create button
const button = createButton<GameMsg>({
  id: 'start-btn',
  x: 400,
  y: 300,
  width: 200,
  height: 50,
  text: 'Start Game',
  onClick: () => [{ type: 'START_GAME' }],
});

// Initialize Mana and render
const state = createComponentState<GameMsg>(scene);
setData(button)(state);
```

## API Reference

### `createButton<Msg>(config: ButtonConfig<Msg>)`

Creates a button component with the specified configuration.

#### ButtonConfig Properties

| Property       | Type                   | Default                             | Description                         |
|----------------|------------------------|-------------------------------------|-------------------------------------|
| `id`           | `string`               | *required*                          | Unique identifier for the button    |
| `x`            | `number`               | *required*                          | X position                          |
| `y`            | `number`               | *required*                          | Y position                          |
| `width`        | `number`               | *required*                          | Button width                        |
| `height`       | `number`               | *required*                          | Button height                       |
| `text`         | `string`               | *required*                          | Button label text                   |
| `onClick`      | `() => readonly Msg[]` | *required*                          | Click handler that returns messages |
| `textStyle`    | `TextStyle`            | `{fontSize: '16px', color: '#fff'}` | Phaser text style                   |
| `normalColor`  | `number`               | `0x4a5568`                          | Button color in normal state        |
| `hoverColor`   | `number`               | `0x2d3748`                          | Button color when hovered           |
| `cornerRadius` | `number`               | `8`                                 | Border radius in pixels             |

#### Returns
`readonly Element<Msg>[]` - An array containing the button container element

### `createButtonGroup<Msg>(buttons, commonConfig?)`

Creates multiple buttons with shared styling.

```typescript
const menuButtons = createButtonGroup<GameMsg>(
  [
    { id: 'start', x: 400, y: 200, text: 'Start', onClick: () => [{ type: 'START' }] },
    { id: 'quit', x: 400, y: 270, text: 'Quit', onClick: () => [{ type: 'QUIT' }] },
  ],
  {
    width: 200,
    height: 50,
    normalColor: 0x1f2937,
    hoverColor: 0x111827,
  }
);
```

### `destroyButton(id: string)`

Cleans up button state and stops any active tweens. Call this when removing a button.

```typescript
scene.events.on('shutdown', () => {
  destroyButton('my-button');
});
```

## Advanced Examples

### Custom Styled Button

```typescript
const fancyButton = createButton<GameMsg>({
  id: 'fancy-btn',
  x: 400,
  y: 300,
  width: 280,
  height: 70,
  text: '✨ Fancy Button ✨',
  normalColor: 0x8b5cf6, // Purple
  hoverColor: 0x7c3aed, // Darker purple
  cornerRadius: 16,
  textStyle: {
    fontSize: '24px',
    fontFamily: 'Arial Black',
    color: '#ffffff',
    fontStyle: 'bold',
  },
  onClick: () => [{ type: 'FANCY_CLICKED' }],
});
```

### Dynamic Button (Updates on Click)

```typescript
let clickCount = 0;

const updateFn = (msg: GameMsg, state: any) => {
  if (msg.type === 'INCREMENT') {
    clickCount++;
    updateButton();
  }
  return state;
};

const state = createComponentState(scene, updateFn);

const updateButton = () => {
  const button = createButton<GameMsg>({
    id: 'counter-btn',
    x: 400,
    y: 300,
    width: 200,
    height: 50,
    text: `Clicks: ${clickCount}`,
    normalColor: clickCount > 10 ? 0x10b981 : 0x3b82f6,
    hoverColor: clickCount > 10 ? 0x059669 : 0x2563eb,
    onClick: () => [{ type: 'INCREMENT' }],
  });
  
  setData(button)(state);
};

updateButton();
```

### Button with Icons

```typescript
const iconButton = createButton<GameMsg>({
  id: 'icon-btn',
  x: 400,
  y: 300,
  width: 60,
  height: 60,
  text: '⚙️', // Emoji or icon font
  cornerRadius: 30, // Circular button
  textStyle: {
    fontSize: '32px',
  },
  onClick: () => [{ type: 'SETTINGS' }],
});
```

### Disabled Button State

```typescript
const createDisabledButton = (enabled: boolean) => createButton<GameMsg>({
  id: 'action-btn',
  x: 400,
  y: 300,
  width: 200,
  height: 50,
  text: enabled ? 'Submit' : 'Loading...',
  normalColor: enabled ? 0x3b82f6 : 0x6b7280,
  hoverColor: enabled ? 0x2563eb : 0x6b7280,
  onClick: enabled ? () => [{ type: 'SUBMIT' }] : () => [],
});
```

## How It Works

### Architecture

The button is composed of:
1. **Container** - Parent element that positions the button
2. **Graphics rect** - Background with rounded corners and fill color
3. **Text** - Label centered on the button

### Hover Animation

When you hover over the button:
1. The `onHover` handler fires
2. A Phaser tween animates the color from `normalColor` to `hoverColor`
3. The graphics element is redrawn with the new color each frame

When you move the mouse out:
1. The `onHoverOut` handler fires
2. A tween animates back to `normalColor`

### State Management

Button states (hover status, tween references, current color) are stored in a `Map` keyed by button ID. This allows:
- Multiple buttons to track their own state
- Tweens to be interrupted smoothly
- Proper cleanup when buttons are destroyed

## Styling Tips

### Color Palettes

```typescript
// Blue theme
normalColor: 0x3b82f6, hoverColor: 0x2563eb

// Green theme
normalColor: 0x10b981, hoverColor: 0x059669

// Red theme
normalColor: 0xef4444, hoverColor: 0xdc2626

// Dark theme
normalColor: 0x1f2937, hoverColor: 0x111827

// Purple theme
normalColor: 0x8b5cf6, hoverColor: 0x7c3aed
```

### Button Sizes

```typescript
// Small button
width: 120, height: 40, textStyle: { fontSize: '14px' }

// Medium button (default)
width: 200, height: 50, textStyle: { fontSize: '16px' }

// Large button
width: 280, height: 70, textStyle: { fontSize: '20px' }

// Icon button
width: 50, height: 50, cornerRadius: 25, textStyle: { fontSize: '24px' }
```

## Integration with Mana

The button component leverages several Mana features:

- ✅ **Graphics element** - Custom type added to support drawing shapes
- ✅ **Hover handlers** - New `onHover` and `onHoverOut` event handlers
- ✅ **Containers** - Button components are returned as containers
- ✅ **Message dispatch** - Buttons send messages on interaction
- ✅ **Reactive updates** - Button appearance updates automatically

## Performance Notes

- **Tween management**: Tweens are stored and stopped before creating new ones to prevent memory leaks
- **Graphics redraw**: Graphics are only redrawn when color changes (during animation)
- **State cleanup**: Call `destroyButton()` to clean up when removing buttons
- **Memoization**: Mana's built-in element comparison prevents unnecessary re-renders

## Complete Example Scene

See `button-example.ts` for a complete, working example including:
- Single custom-styled button
- Button group with shared styling
- Dynamic button that updates on click
- Proper cleanup on scene shutdown

## Extending the Button

You can extend the button component by:

1. **Adding more visual states** (pressed, disabled, loading)
2. **Supporting different shapes** (circles, polygons)
3. **Adding sound effects** on hover/click
4. **Supporting button badges** or notification dots
5. **Adding keyboard shortcuts**
6. **Creating button templates** for different use cases

## Troubleshooting

**Button not clickable?**
- Ensure the button has sufficient size
- Check that `interactive: true` is being set (automatic for buttons)
- Verify the button is not behind other elements

**Hover animation not working?**
- Check that the scene is running
- Ensure tweens are enabled in your Phaser config
- Verify `normalColor` and `hoverColor` are different

**Button not rendering?**
- Ensure `setData()` is called after creating the button
- Check that x, y coordinates are within the camera bounds
- Verify the Mana state is properly initialized

## License

MIT - Part of the Mana reactive rendering library for Phaser
