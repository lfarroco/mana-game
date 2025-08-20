import Phaser from "phaser";
import * as c from "../constants/constants";
import { scene } from "../Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import * as Tooltip from "./Tooltip";
import { GoldCoinAnimator } from "./GoldCoinAnimator";

export let ui: UIManager;

export class UIManager {
	uiContainer: Phaser.GameObjects.Container | null = null;
	goldContainer: Phaser.GameObjects.Container | null = null;
	goldTextElement: Phaser.GameObjects.Text | null = null;
	prestigeTextElement: Phaser.GameObjects.Text | null = null;
	goldCoinAnimator: GoldCoinAnimator;

	constructor() {
		this.goldCoinAnimator = new GoldCoinAnimator(scene);
		Tooltip.initializeTooltip(scene);
		ui = this;
	}

	handlePurchaseFailed(payload: { unitName: string, reason: string, cost?: number }): void {
		let message = `Could not buy ${payload.unitName}. `;
		switch (payload.reason) {
			case "PARTY_FULL":
				message += "Your party is full!";
				break;
			case "INSUFFICIENT_GOLD":
				message += `Not enough gold! (Cost: ${payload.cost ?? 'N/A'})`;
				break;
			case "SLOT_OCCUPIED":
				message += "That slot is already occupied.";
				break;
			default: message += "Reason unknown.";
		}
		this.handleUserMessageRequested({ text: message, type: 'error' });

	}

	handleGoldChanged(newTotalGold: number, goldDelta: number): void {
		if (this.goldTextElement) {
			this.goldTextElement.setText(`${newTotalGold}`);
			if (goldDelta !== 0) {
				this.goldChangeAnimation(goldDelta);
			}
		}
	}

	updatePrestige(newTotalPrestige: number, _prestigeDelta: number): void {
		if (this.prestigeTextElement) {
			this.prestigeTextElement.setText(`${newTotalPrestige}`);
		}
	}

	_updateMoraleTextWithAnimation(textElement: Phaser.GameObjects.Text, newMorale: number): void {
		scene.tweens.killTweensOf(textElement);

		textElement.setRotation(0);

		textElement.setText(`${Math.floor(newMorale)}`);

		const timeline = scene.add.timeline([{
			at: 0,
			tween: {
				targets: textElement,
				rotation: 0.08,
				duration: 80,
				ease: 'Power1'
			}
		}, {
			at: 80,
			tween: {
				targets: textElement,
				rotation: -0.08,
				duration: 160,
				ease: 'Power1'
			}
		}, {
			at: 160,
			tween: {
				targets: textElement,
				rotation: 0,
				duration: 80,
				ease: 'Power1'
			}
		}]);
		timeline.play();
	}

	createMainUI() {
		this.destroyMainUI();

		this.uiContainer = scene.add.container(0, 0);

		this._createGoldText(this.uiContainer);

		if (this.prestigeTextElement) {
			this.prestigeTextElement.setText(`${scene.state.gameData.player.prestige}`);
		}
	}

	_createGoldText(parent: Phaser.GameObjects.Container): void {
		const initialGold = scene.state.gameData.player.gold;

		const displayX = c.SCREEN_WIDTH - 120;
		const displayY = 30;

		this.goldContainer = scene.add.container(displayX, displayY);

		const background = scene.add.graphics();
		background.fillStyle(0x2d3d1a, 0.8);
		background.lineStyle(3, 0x1a2610, 1);
		background.fillRoundedRect(-50, -20, 100, 40, 20);
		background.strokeRoundedRect(-50, -20, 100, 40, 20);
		this.goldContainer.add(background);

		const coinIcon = scene.add.image(-25, 0, 'coin').setScale(0.8);
		this.goldContainer.add(coinIcon);

		this.goldTextElement = scene.add.text(
			0, 0,
			`${initialGold}`,
			{
				...c.titleTextConfig,
				fontSize: '24px',
				color: '#ffffff'
			}
		).setOrigin(0, 0.5);
		this.goldContainer.add(this.goldTextElement);

		const initialPrestige = scene.state.gameData.player.prestige;
		const prestigeContainer = scene.add.container(0, 44);

		const prestigeBg = scene.add.graphics();
		prestigeBg.fillStyle(0x3a2d1a, 0.8);
		prestigeBg.lineStyle(3, 0x261a10, 1);
		prestigeBg.fillRoundedRect(-50, -20, 100, 40, 20);
		prestigeBg.strokeRoundedRect(-50, -20, 100, 40, 20);
		prestigeContainer.add(prestigeBg);

		const prestigeIcon = scene.add.image(-25, 0, 'coin').setScale(0.8);
		prestigeIcon.setTint(0x4a90ff);
		prestigeContainer.add(prestigeIcon);

		this.prestigeTextElement = scene.add.text(
			0, 0,
			`${initialPrestige}`,
			{
				...c.titleTextConfig,
				fontSize: '24px',
				color: '#ffffff'
			}
		).setOrigin(0, 0.5);
		prestigeContainer.add(this.prestigeTextElement);

		this.goldContainer.add(prestigeContainer);

		parent.add(this.goldContainer);
	}

	async handleUserMessageRequested(payload: {
		text: string;
		type: 'error' | 'info' | 'warning' | 'success';
	}): Promise<void> {

		const textStyle = c.titleTextConfig;

		const text = scene.add.text(
			c.SCREEN_WIDTH / 2, c.SCREEN_HEIGHT - 100,
			payload.text,
			textStyle,
		).setOrigin(0.5);

		await tween({
			targets: [text],
			scaleX: 1.05,
			scaleY: 1.05,
			duration: 1000,
			yoyo: true,
			ease: "Sine.elastic",
			repeat: 0,
		});

		await tween({
			targets: [text],
			alpha: 0,
		});

		text.destroy();
	}

	destroyMainUI(): void {
		if (this.uiContainer) {
			this.uiContainer.destroy(true);
			this.uiContainer = null;
		}
		this.goldContainer = null;
		this.goldTextElement = null;
		this.prestigeTextElement = null;
	}

	destroy(): void { // Full cleanup for the UIManager
		this.destroyMainUI();
		Tooltip.destroyTooltip();
	}

	async goldChangeAnimation(gold: number): Promise<void> {
		const sign = gold > 0 ? "+" : "";
		const animationText = `${sign}${gold}`;

		const startX = this.goldTextElement!.x + this.goldTextElement!.width / 2;
		const startY = this.goldTextElement!.y + this.goldTextElement!.height / 2;

		const goldAmountText = scene.add.text(
			startX,
			startY,
			animationText, c.titleTextConfig)
			.setOrigin(0.5, 0.5)
			.setAlpha(0)
			.setScale(1);

		await tween({
			targets: [goldAmountText],
			alpha: 1,
			scale: 1.2,
			y: startY - 30,
		});

		await tween({
			targets: [goldAmountText],
			alpha: 0,
			scale: 1,
			y: startY - 60,
			duration: 800,
		});

		goldAmountText.destroy();
	}

	async coinDropIO(
		gold: number,
		coins: number,
		x: number, y: number,
	): Promise<void> {
		this.goldChangeAnimation(gold);
		if (!this.goldCoinAnimator) {
			console.error("UIManager: GoldCoinAnimator not initialized. Cannot play coin drop animation.");
			return;
		}
		await this.goldCoinAnimator.animateCoinDrop(coins, x, y);
	}
}