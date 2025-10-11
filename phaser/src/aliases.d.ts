import type * as Phaser from 'phaser';

declare global {
	type Scene = Phaser.Scene;
	type Container = Phaser.GameObjects.Container;
	type Graphics = Phaser.GameObjects.Graphics;
	type Sprite = Phaser.GameObjects.Sprite;
	type TextObj = Phaser.GameObjects.Text;
	type Image = Phaser.GameObjects.Image;
	type Pointer = Phaser.Input.Pointer;
	type Vec2 = { x: number, y: number }
	type Dimension = { width: number, height: number }
}

export { };