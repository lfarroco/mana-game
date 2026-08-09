import type * as Phaser from "phaser";

declare global {
	type Scene = Phaser.Scene;
	type Container = Phaser.GameObjects.Container;
	type Graphics = Phaser.GameObjects.Graphics;
	type Sprite = Phaser.GameObjects.Sprite;
	type TextObj = Phaser.GameObjects.Text;
	type Image = Phaser.GameObjects.Image;
	type Pointer = Phaser.Input.Pointer;
	type Vec2 = [number, number];
	type Size = [number, number];

	// Minimal declaration for the Node.js `process` global (used in Electron and
	// replaced at build-time by webpack DefinePlugin for process.env.*).
	var process: {
		env: Record<string, string | undefined>;
		[key: string]: unknown;
	};
}

export {};
