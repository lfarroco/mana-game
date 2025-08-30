import type * as Phaser from 'phaser';

declare global {
	type Scene = Phaser.Scene;
	type Container = Container;
	type Graphics = Graphics;
	type Sprite = Phaser.GameObjects.Sprite;
	type TextObj = Phaser.GameObjects.Text;
	type Image = Phaser.GameObjects.Image;
	type Pointer = Pointer;
	type Vec2 = { x: number, y: number }
}

export { };