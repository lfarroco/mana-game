import Phaser from 'phaser';
import { defaultTextConfig, FORCE_ID_PLAYER } from '../../constants/constants';

const BAR_WIDTH = 250;
const BAR_HEIGHT = 20;
const BORDER_THICKNESS = 2;

export class MoraleDisplay extends Phaser.GameObjects.Container {
	private backgroundBar: Phaser.GameObjects.Graphics;
	private foregroundBar: Phaser.GameObjects.Graphics;
	private barFill: Phaser.GameObjects.Graphics;
	private label: Phaser.GameObjects.Text;

	constructor(
		scene: Phaser.Scene,
		x: number, y: number,
		forceId: string,
		labelText: string,
	) {
		super(scene, x, y);

		// Background
		this.backgroundBar = this.scene.add.graphics();
		this.backgroundBar.fillStyle(0x000000, 0.5);
		this.backgroundBar.fillRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
		this.backgroundBar.lineStyle(BORDER_THICKNESS, 0xffffff, 0.8);
		this.backgroundBar.strokeRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
		this.add(this.backgroundBar);

		// Foreground
		this.foregroundBar = this.scene.add.graphics();
		const barColor = forceId === FORCE_ID_PLAYER ? 0x4e9de0 : 0xe04e4e; // Blue for player, Red for CPU
		this.foregroundBar.fillStyle(barColor, 1);
		this.foregroundBar.fillRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
		this.add(this.foregroundBar);

		// Shape to "fill" of the foreground bar
		this.barFill = this.scene.add.graphics();
		this.barFill.fillStyle(0xffffff);
		this.barFill.fillRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
		this.add(this.barFill);

		// Label
		this.label = this.scene.add.text(
			BAR_WIDTH / 2, BAR_HEIGHT / 2,
			labelText, defaultTextConfig
		).setOrigin(0.5);
		this.add(this.label);

		this.scene.add.existing(this);
		this.setVisible(false); // Initially hidden
	}

	public updateMorale(currentMorale: number, maxMorale: number = 100): void {
		const percentage = Math.max(0, currentMorale) / maxMorale;
		// Animate the mask's horizontal scale to reveal the bar
		this.scene.tweens.add({ targets: this.barFill, scaleX: percentage, duration: 200, ease: 'Power1' });
	}
}