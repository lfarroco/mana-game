# Shape Elements

The Mana library now supports dedicated shape element types that are cleaner and more declarative than using the generic `graphics` element with a `shapes` array.

## Available Shape Elements

### Rectangle (`rect`)

A rectangular shape element.

```typescript
import { RectangleElement } from './mana';

const rect: RectangleElement<Msg> = {
  id: 'my-rect',
  type: 'rect',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  fillColor: 0x4a5568,
  fillAlpha: 1,
  strokeColor: 0x2d3748,
  strokeWidth: 2,
  strokeAlpha: 1,
  interactive: true,
  onClick: () => [{ type: 'RECT_CLICKED' }],
};
```

### Rounded Rectangle (`roundrect`)

A rectangular shape with rounded corners.

```typescript
import { RoundedRectangleElement } from './mana';

const roundrect: RoundedRectangleElement<Msg> = {
  id: 'my-roundrect',
  type: 'roundrect',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  radius: 8,  // Corner radius
  fillColor: 0x4a5568,
  fillAlpha: 1,
  strokeColor: 0x2d3748,
  strokeWidth: 2,
  strokeAlpha: 1,
  interactive: true,
  onClick: () => [{ type: 'BUTTON_CLICKED' }],
};
```

### Circle (`circle`)

A circular shape element.

```typescript
import { CircleElement } from './mana';

const circle: CircleElement<Msg> = {
  id: 'my-circle',
  type: 'circle',
  x: 100,
  y: 100,
  radius: 50,
  fillColor: 0x4a5568,
  fillAlpha: 1,
  strokeColor: 0x2d3748,
  strokeWidth: 2,
  strokeAlpha: 1,
  interactive: true,
  onClick: () => [{ type: 'CIRCLE_CLICKED' }],
};
```

### Ellipse (`ellipse`)

An elliptical shape element.

```typescript
import { EllipseElement } from './mana';

const ellipse: EllipseElement<Msg> = {
  id: 'my-ellipse',
  type: 'ellipse',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  fillColor: 0x4a5568,
  fillAlpha: 1,
  strokeColor: 0x2d3748,
  strokeWidth: 2,
  strokeAlpha: 1,
  interactive: true,
  onClick: () => [{ type: 'ELLIPSE_CLICKED' }],
};
```

## Common Properties

All shape elements support:

- **Position**: `x`, `y`
- **Fill**: `fillColor` (hex), `fillAlpha` (0-1)
- **Stroke**: `strokeColor` (hex), `strokeWidth`, `strokeAlpha` (0-1)
- **Interactivity**: `interactive`, `onClick`, `onHover`, `onHoverOut`
- **Hit Area**: Custom `hitArea` for precise click detection
- **Lifecycle**: `onMount` callback
- **Transform**: `alpha`, `rotation`, `scale`, `visible`

## Manual Drawing with `skipAutoUpdate`

For cases where you need to manually control drawing (e.g., color tweens), use the `skipAutoUpdate` flag:

```typescript
const rect: RectangleElement<Msg> & { skipAutoUpdate?: boolean } = {
  id: 'animated-rect',
  type: 'rect',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  fillColor: 0x4a5568,
  skipAutoUpdate: true,  // Prevent automatic redrawing
  onMount: (gameObject) => {
    const graphics = gameObject as Phaser.GameObjects.Graphics;
    // Manually draw or update the graphics
  },
};
```

## Hit Areas

Shape elements support custom hit areas for precise click detection:

```typescript
const rect: RectangleElement<Msg> = {
  // ... other properties
  interactive: true,
  hitArea: {
    shape: new Phaser.Geom.Rectangle(-100, -50, 200, 100),
    callback: Phaser.Geom.Rectangle.Contains,
  },
  onClick: () => [{ type: 'CLICKED' }],
};
```

## Benefits Over `graphics` Element

1. **Cleaner API**: No need for nested `shapes` arrays
2. **Type Safety**: Each shape has its own specific type
3. **Better Autocomplete**: IDE can suggest shape-specific properties
4. **Simpler Updates**: Direct property updates instead of shape array manipulation
5. **Easier to Read**: Element definition matches visual intent

## When to Use `graphics` Element

The generic `graphics` element is still useful for:
- Drawing multiple shapes in one element
- Complex custom shapes
- Dynamic shape composition
- Advanced graphics operations

## Example: Button Component

Here's how the button component uses `roundrect`:

```typescript
const background: RoundedRectangleElement<Msg> = {
  id: 'button-bg',
  type: 'roundrect',
  x: 0,
  y: 0,
  width: 200,
  height: 50,
  radius: 8,
  fillColor: normalColor,
  fillAlpha: 1,
  interactive: true,
  hitArea: {
    shape: new Phaser.Geom.Rectangle(-100, -25, 200, 50),
    callback: Phaser.Geom.Rectangle.Contains,
  },
  onClick: () => handleClick(),
  onHover: () => handleHover(),
  onHoverOut: () => handleHoverOut(),
};
```

## Notes

- All shape elements are rendered using Phaser's Graphics API internally
- Shapes are centered at their x,y position (rectangles use -width/2, -height/2 offsets)
- Colors are specified in hexadecimal format (e.g., `0x4a5568`)
- Alpha values range from 0 (transparent) to 1 (opaque)
