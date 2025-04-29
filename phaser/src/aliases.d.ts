import type * as Phaser from 'phaser';

declare global {
	type Container = Phaser.GameObjects.Container;
	type Sprite = Phaser.GameObjects.Sprite;
	type Text = Phaser.GameObjects.Text;
	type Image = Phaser.GameObjects.Image;
}

export { };