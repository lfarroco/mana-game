# Shape-Based Graphics System

Graphics elements in Mana are now composed of declarative shape definitions, removing the need for imperative drawing functions.

## Benefits

- **Declarative**: Define what you want, not how to draw it
- **Composable**: Layer multiple shapes to create complex graphics
- **Reactive**: Shapes automatically redraw when data changes
- **Type-safe**: Full TypeScript support for all shape properties
- **No side effects**: Pure data structures, no imperative code

## Available Shapes

### Rectangle
```typescript
{
  type: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  fillColor: 0x3b82f6,
  fillAlpha: 1,
  strokeColor: 0x1e40af,
  strokeWidth: 2,
  strokeAlpha: 1,
}
```

### Rounded Rectangle
```typescript
{
  type: 'roundedRectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  radius: 10,
  fillColor: 0x3b82f6,
  fillAlpha: 1,
}
```

### Circle
```typescript
{
  type: 'circle',
  x: 0,
  y: 0,
  radius: 25,
  fillColor: 0x10b981,
  fillAlpha: 1,
  strokeColor: 0x059669,
  strokeWidth: 2,
}
```

### Ellipse
```typescript
{
  type: 'ellipse',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  fillColor: 0xf59e0b,
  fillAlpha: 0.5,
}
```

### Line
```typescript
{
  type: 'line',
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 100,
  strokeColor: 0xef4444,
  strokeWidth: 3,
  strokeAlpha: 1,
}
```

### Polygon
```typescript
{
  type: 'polygon',
  points: [
    { x: 0, y: -50 },
    { x: 50, y: 50 },
    { x: -50, y: 50 },
  ],
  fillColor: 0x8b5cf6,
  fillAlpha: 1,
}
```

### Arc
```typescript
{
  type: 'arc',
  x: 0,
  y: 0,
  radius: 50,
  startAngle: 0,
  endAngle: Math.PI,
  anticlockwise: false,
  fillColor: 0xec4899,
  fillAlpha: 1,
}
```

### Triangle
```typescript
{
  type: 'triangle',
  x1: 0,
  y1: -25,
  x2: 25,
  y2: 25,
  x3: -25,
  y3: 25,
  fillColor: 0x06b6d4,
  fillAlpha: 1,
}
```

## Graphics Element Structure

```typescript
const graphicsElement: GraphicsElement<Msg> = {
  id: 'my-graphics',
  type: 'graphics',
  x: 100,
  y: 100,
  shapes: [
    // Array of shape definitions
    { type: 'rectangle', x: 0, y: 0, width: 100, height: 50, fillColor: 0x3b82f6 },
    { type: 'circle', x: 0, y: 0, radius: 10, fillColor: 0xffffff },
  ],
  interactive: true,
  hitArea: {
    shape: new Phaser.Geom.Rectangle(-50, -25, 100, 50),
    callback: Phaser.Geom.Rectangle.Contains,
  },
  onClick: () => [{ type: 'CLICKED' }],
};
```

## Shape Composition Examples

### Button with Highlight
```typescript
shapes: [
  // Base
  {
    type: 'roundedRectangle',
    x: -100, y: -25,
    width: 200, height: 50,
    radius: 10,
    fillColor: 0x2d3748,
  },
  // Inner highlight
  {
    type: 'roundedRectangle',
    x: -96, y: -21,
    width: 192, height: 42,
    radius: 8,
    fillColor: 0x4a5568,
    fillAlpha: 0.3,
  },
]
```

### Progress Circle
```typescript
shapes: [
  // Background
  {
    type: 'circle',
    x: 0, y: 0,
    radius: 50,
    fillColor: 0x374151,
  },
  // Progress arc
  {
    type: 'arc',
    x: 0, y: 0,
    radius: 45,
    startAngle: -Math.PI / 2,
    endAngle: -Math.PI / 2 + (2 * Math.PI * progress),
    fillColor: 0x10b981,
  },
  // Inner circle
  {
    type: 'circle',
    x: 0, y: 0,
    radius: 35,
    fillColor: 0x1f2937,
  },
]
```

### Decorative Frame
```typescript
shapes: [
  // Outer border
  { type: 'rectangle', x: -100, y: -100, width: 200, height: 200, strokeColor: 0xfbbf24, strokeWidth: 3 },
  // Inner border
  { type: 'rectangle', x: -94, y: -94, width: 188, height: 188, strokeColor: 0xfbbf24, strokeWidth: 1 },
  // Corner circles
  { type: 'circle', x: -100, y: -100, radius: 4, fillColor: 0xfbbf24 },
  { type: 'circle', x: 100, y: -100, radius: 4, fillColor: 0xfbbf24 },
  { type: 'circle', x: -100, y: 100, radius: 4, fillColor: 0xfbbf24 },
  { type: 'circle', x: 100, y: 100, radius: 4, fillColor: 0xfbbf24 },
]
```

## Shape Properties

All shapes support these optional properties where applicable:

- **Fill**: `fillColor` (hex), `fillAlpha` (0-1)
- **Stroke**: `strokeColor` (hex), `strokeWidth` (px), `strokeAlpha` (0-1)

Position coordinates are relative to the graphics element's x/y position.

## Migration from Old System

**Before (imperative):**
```typescript
{
  type: 'graphics',
  draw: (graphics) => {
    graphics.clear();
    graphics.fillStyle(0x3b82f6, 1);
    graphics.fillRoundedRect(0, 0, 100, 50, 10);
  }
}
```

**After (declarative):**
```typescript
{
  type: 'graphics',
  shapes: [
    {
      type: 'roundedRectangle',
      x: 0, y: 0,
      width: 100, height: 50,
      radius: 10,
      fillColor: 0x3b82f6,
      fillAlpha: 1,
    }
  ]
}
```

## Advanced Usage

### Dynamic Shapes
```typescript
const createButton = (color: number) => ({
  type: 'graphics',
  shapes: [
    { type: 'roundedRectangle', fillColor: color, ... },
    // Conditionally include shapes
    ...(isHighlighted ? [{ type: 'circle', ... }] : []),
  ]
});
```

### Animated Shapes
Update shape properties in your message handler and the graphics will automatically redraw:

```typescript
const update = (msg: Msg, state: State) => {
  if (msg.type === 'PROGRESS_UPDATE') {
    return {
      ...state,
      progress: msg.progress,
      // Shape with updated endAngle will redraw automatically
    };
  }
};
```

## See Also

- `fancy-button-example.ts` - Complex multi-shape compositions
- `manabutton.ts` - Simple button implementation
- `types.ts` - Complete shape type definitions
