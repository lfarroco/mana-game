// Mock Phaser for testing
const Phaser = {
	GameObjects: {
		Graphics: class Graphics { },
		Sprite: class Sprite { },
		Container: class Container { },
		Text: class Text { },
	},
	BlendModes: {
		NORMAL: 0,
		ADD: 1,
		MULTIPLY: 2,
		SCREEN: 3,
	},
	Scene: class Scene { },
	Game: class Game { },
};

export default Phaser;
export const { BlendModes, GameObjects, Scene, Game } = Phaser;
