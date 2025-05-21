import type * as Phaser from 'phaser';

declare global {
	type Scene = Phaser.Scene;
	type Container = Phaser.GameObjects.Container;
	type Sprite = Phaser.GameObjects.Sprite;
	type Text = Phaser.GameObjects.Text;
	type Image = Phaser.GameObjects.Image;
	type Pointer = Phaser.Input.Pointer;
}

export { };