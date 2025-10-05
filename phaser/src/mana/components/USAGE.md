# Using the Button Component in a Phaser Scene

## Quick Start - 3 Steps

### 1. Import (Single Import!)

```typescript
import { createComponent } from '../mana';
import { createButton } from '../mana/components/manabutton';
```

### 2. Define your message types

```typescript
type MenuMsg = 
  | { type: 'START_GAME' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'QUIT' };
```

### 3. Use in your scene's `create()` method

```typescript
class MenuScene extends Phaser.Scene {
  create() {
    // Initialize with the new simplified API - just one line!
    const render = createComponent<MenuMsg>(this, (msg, state) => {
      console.log('Message:', msg);
      return state;
    });

    // Create button
    const startButton = createButton<MenuMsg>({
      id: 'start-btn',
      x: 400,      // Center of 800px wide screen
      y: 300,      // Center of 600px tall screen
      width: 200,
      height: 50,
      text: 'Start Game',
      onClick: () => [{ type: 'START_GAME' }],
    });

    // Render button
    render(startButton);
  }
}
```

## Complete Working Example

Here's a full scene with multiple buttons and message handling:

```typescript
import Phaser from 'phaser';
import { createComponent } from '../mana';
import { createButton, destroyButton } from '../mana/components/manabutton';

// 1. Define your messages
type MenuMsg = 
  | { type: 'START_GAME' }
  | { type: 'LOAD_GAME' }
  | { type: 'SETTINGS' }
  | { type: 'QUIT' };

// 2. Create your scene
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // Set background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Initialize Mana with the new simplified API
    const render = createComponent<MenuMsg>(this, this.handleMessage.bind(this));

    // Create title text
    const title = {
      id: 'title',
      type: 'text' as const,
      x: 400,
      y: 100,
      text: 'My Awesome Game',
      style: {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      },
    };

    // Create menu buttons
    const startButton = createButton<MenuMsg>({
      id: 'start-btn',
      x: 400,
      y: 250,
      width: 220,
      height: 60,
      text: 'Start New Game',
      normalColor: 0x4a90e2,
      hoverColor: 0x2563eb,
      onClick: () => [{ type: 'START_GAME' }],
    });

    const loadButton = createButton<MenuMsg>({
      id: 'load-btn',
      x: 400,
      y: 330,
      width: 220,
      height: 60,
      text: 'Load Game',
      normalColor: 0x4a90e2,
      hoverColor: 0x2563eb,
      onClick: () => [{ type: 'LOAD_GAME' }],
    });

    const settingsButton = createButton<MenuMsg>({
      id: 'settings-btn',
      x: 400,
      y: 410,
      width: 220,
      height: 60,
      text: 'Settings',
      normalColor: 0x6c757d,
      hoverColor: 0x5a6268,
      onClick: () => [{ type: 'SETTINGS' }],
    });

    const quitButton = createButton<MenuMsg>({
      id: 'quit-btn',
      x: 400,
      y: 490,
      width: 220,
      height: 60,
      text: 'Quit',
      normalColor: 0xdc3545,
      hoverColor: 0xc82333,
      onClick: () => [{ type: 'QUIT' }],
    });

    // Combine all elements
    const allComponents = [
      title,
      ...startButton,
      ...loadButton,
      ...settingsButton,
      ...quitButton,
    ];

    // Render everything
    render(allComponents);
  }

  // Handle messages from buttons
  private handleMessage(msg: MenuMsg, state: any) {
    switch (msg.type) {
      case 'START_GAME':
        console.log('Starting new game...');
        this.scene.start('GameScene'); // Switch to game scene
        break;

      case 'LOAD_GAME':
        console.log('Loading saved game...');
        // Your load game logic here
        break;

      case 'SETTINGS':
        console.log('Opening settings...');
        this.scene.start('SettingsScene');
        break;

      case 'QUIT':
        console.log('Quitting game...');
        // Your quit logic here
        if (typeof window !== 'undefined') {
          window.close();
        }
        break;
    }
    return state;
  }

  // Clean up when scene is destroyed
  shutdown() {
    destroyButton('start-btn');
    destroyButton('load-btn');
    destroyButton('settings-btn');
    destroyButton('quit-btn');
  }
}
```

## Adding to Your Game Config

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [MenuScene], // Add your scene here
  backgroundColor: '#1a1a2e',
};

const game = new Phaser.Game(config);
```

## Dynamic Buttons (Updating on State Change)

If you want buttons that change based on game state:

```typescript
class GameScene extends Phaser.Scene {
  private score = 0;
  private render: (elements: Element[]) => void;

  create() {
    this.render = createComponent<GameMsg>(
      this,
      this.handleMessage.bind(this)
    );

    this.updateUI();
  }

  private handleMessage(msg: GameMsg, state: any) {
    if (msg.type === 'CLICK_BUTTON') {
      this.score += 10;
      this.updateUI(); // Re-render with new score
    }
    return state;
  }

  private updateUI() {
    // Button text changes based on score
    const button = createButton<GameMsg>({
      id: 'score-btn',
      x: 400,
      y: 300,
      width: 200,
      height: 60,
      text: `Score: ${this.score}`,
      // Button color changes when score is high
      normalColor: this.score > 50 ? 0x10b981 : 0x3b82f6,
      hoverColor: this.score > 50 ? 0x059669 : 0x2563eb,
      onClick: () => [{ type: 'CLICK_BUTTON' }],
    });

    this.render(button);
  }
}
```

## Using Button Groups

For multiple similar buttons:

```typescript
import { createButtonGroup } from '../mana/components/manabutton';

create() {
  const render = createComponent<MenuMsg>(this, (msg, state) => {
    console.log('Message:', msg);
    return state;
  });

  const menuButtons = createButtonGroup<MenuMsg>(
    [
      { id: 'btn1', x: 400, y: 200, text: 'Option 1', onClick: () => [{ type: 'OPTION_1' }] },
      { id: 'btn2', x: 400, y: 270, text: 'Option 2', onClick: () => [{ type: 'OPTION_2' }] },
      { id: 'btn3', x: 400, y: 340, text: 'Option 3', onClick: () => [{ type: 'OPTION_3' }] },
    ],
    {
      // Shared styling for all buttons
      width: 200,
      height: 50,
      normalColor: 0x1f2937,
      hoverColor: 0x111827,
    }
  );

  render(menuButtons);
}
```

## Combining with Other Mana Components

You can mix buttons with other elements:

```typescript
create() {
  const render = createComponent<GameMsg>(this, (msg, state) => {
    console.log('Message:', msg);
    return state;
  });

  // Background image
  const background = {
    id: 'bg',
    type: 'image' as const,
    x: 400,
    y: 300,
    texture: 'menu-background',
  };

  // Title text
  const title = {
    id: 'title',
    type: 'text' as const,
    x: 400,
    y: 100,
    text: 'Menu',
    style: { fontSize: '32px', color: '#fff' },
  };

  // Button
  const button = createButton<GameMsg>({
    id: 'play-btn',
    x: 400,
    y: 300,
    width: 200,
    height: 60,
    text: 'Play',
    onClick: () => [{ type: 'PLAY' }],
  });

  // Combine everything
  const allElements = [background, title, ...button];
  render(allElements);
}
```

## Common Patterns

### Pattern 1: Menu with Back Button

```typescript
const createMenu = () => [
  // Main buttons
  ...createButton({ id: 'play', x: 400, y: 200, text: 'Play', onClick: ... }),
  ...createButton({ id: 'options', x: 400, y: 270, text: 'Options', onClick: ... }),
  
  // Back button in corner
  ...createButton({ 
    id: 'back', 
    x: 100, 
    y: 550, 
    width: 120, 
    height: 40,
    text: 'Back',
    normalColor: 0x6c757d,
    onClick: () => [{ type: 'GO_BACK' }],
  }),
];
```

### Pattern 2: Disabled Button

```typescript
const createSubmitButton = (canSubmit: boolean) => createButton({
  id: 'submit',
  x: 400,
  y: 500,
  width: 200,
  height: 60,
  text: canSubmit ? 'Submit' : 'Please Wait...',
  normalColor: canSubmit ? 0x10b981 : 0x6c757d,
  hoverColor: canSubmit ? 0x059669 : 0x6c757d,
  onClick: canSubmit ? () => [{ type: 'SUBMIT' }] : () => [],
});
```

### Pattern 3: Icon Button

```typescript
const settingsButton = createButton({
  id: 'settings',
  x: 750,  // Top right corner
  y: 50,
  width: 50,
  height: 50,
  text: '⚙️',  // Emoji or icon
  cornerRadius: 25,  // Make it circular
  textStyle: { fontSize: '24px' },
  onClick: () => [{ type: 'SETTINGS' }],
});
```

## Troubleshooting

**Q: My button isn't showing up**
```typescript
// Make sure you're calling render!
const render = createComponent(scene, handler);
const button = createButton({ ... });
render(button);  // ← Don't forget this!
```

**Q: Button is at the wrong position**
```typescript
// Button uses center positioning
// For 800x600 screen:
x: 400,  // Horizontal center
y: 300,  // Vertical center
```

**Q: Hover isn't working**
```typescript
// Make sure your game config has input enabled
const config = {
  // ...
  input: {
    // This should be enabled by default, but check if you disabled it
  }
};
```

**Q: Need to clean up buttons?**
```typescript
// In your scene's shutdown or destroy method:
shutdown() {
  destroyButton('button-id');
}
```

## Next Steps

- Check out `button-example.ts` for more complete examples
- See the main README in `/mana/components/README.md` for advanced features
- Combine buttons with containers for complex UI layouts
- Add sound effects in the onClick handlers
- Create custom button variants by wrapping `createButton`
