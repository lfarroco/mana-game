import Phaser from 'phaser';
import { SystemEvent, EventEmitter } from '@Systems/Events';
import * as ShopPanel from '@Systems/Shop/ShopPanel';
import * as Board from '@Models/Board';
import * as CharaShop from '@Systems/Shop/CharaShop';
import * as Chara from '@Systems/Chara/Chara';
import { tween } from '@Utils/animation';

/**
 * Visualizer - Handles all visual updates and animations based on system events
 * Separates business logic from visual concerns per Architecture Proposal Item 3
 */
export class Visualizer {
	private scene: Phaser.Scene;
	private eventEmitter: EventEmitter;

	constructor(scene: Phaser.Scene, eventEmitter: EventEmitter) {
		this.scene = scene;
		this.eventEmitter = eventEmitter;
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		this.eventEmitter.on('SHOP_OPENED', this.handleShopOpened.bind(this));
		this.eventEmitter.on('UNIT_PURCHASED', this.handleUnitPurchased.bind(this));
		this.eventEmitter.on('SHOP_CLOSED', this.handleShopClosed.bind(this));
		this.eventEmitter.on('PHASE_SKIPPED', this.handlePhaseSkipped.bind(this));
		this.eventEmitter.on('UNIT_DAMAGED', this.handleUnitDamaged.bind(this));
		this.eventEmitter.on('UNIT_HEALED', this.handleUnitHealed.bind(this));
		this.eventEmitter.on('COMBAT_STARTED', this.handleCombatStarted.bind(this));
		this.eventEmitter.on('COMBAT_ENDED', this.handleCombatEnded.bind(this));
		this.eventEmitter.on('REGEN_APPLIED', this.handleRegenApplied.bind(this));
		this.eventEmitter.on('POISON_APPLIED', this.handlePoisonApplied.bind(this));
		this.eventEmitter.on('TIMEOUT_DAMAGE_APPLIED', this.handleTimeoutDamageApplied.bind(this));
	}

	private handleShopOpened(event: SystemEvent): void {
		if (event.type !== 'SHOP_OPENED') return;

		// Create shop UI
		ShopPanel.create(() => {
			// Shop close callback - emit close event
			this.eventEmitter.emit({ type: 'SHOP_CLOSED', shopType: event.shopType });
		});

		// Render shop items based on type
		if (event.shopType === 'hero') {
			const displayedCharas = CharaShop.renderTavernCharas(event.cardIds.map(id => {
				// This would need to be imported from Card module
				// For now, assume we have access to card definitions
				return { id } as any;
			}));
			displayedCharas.forEach((chara) => this.animateItemAppearance(chara));
		}

		// Hide enemy board during shop
		Board.setEnemyBoardVisible(false);

		// Animate shop slide in
		ShopPanel.slideIn();
	}

	private handleUnitPurchased(event: SystemEvent): void {
		if (event.type !== 'UNIT_PURCHASED') return;

		// Find the purchased unit and animate it to its slot
		const chara = Chara.getCharaById(event.cardId);
		if (chara && event.targetSlot !== undefined) {
			// Animate unit placement
			this.animateUnitPlacement(chara, event.targetSlot);
		}
	}

	private handleShopClosed(event: SystemEvent): void {
		if (event.type !== 'SHOP_CLOSED') return;

		// Animate shop slide out
		ShopPanel.slideOut();
		Board.setEnemyBoardVisible(true);
	}

	private handlePhaseSkipped(event: SystemEvent): void {
		if (event.type !== 'PHASE_SKIPPED') return;

		// Visual feedback for phase skip
		this.showPhaseTransition();
	}

	private handleUnitDamaged(event: SystemEvent): void {
		if (event.type !== 'UNIT_DAMAGED') return;

		const chara = Chara.getCharaById(event.unitId);
		if (chara) {
			// Animate damage effect
			this.animateDamage(chara, event.damage);
		}
	}

	private handleUnitHealed(event: SystemEvent): void {
		if (event.type !== 'UNIT_HEALED') return;

		const chara = Chara.getCharaById(event.unitId);
		if (chara) {
			// Animate healing effect
			this.animateHealing(chara, event.healing);
		}
	}

	private handleCombatStarted(event: SystemEvent): void {
		if (event.type !== 'COMBAT_STARTED') return;

		// Highlight combatants
		this.highlightCombatants(event.attackerId, event.defenderId);
	}

	private handleCombatEnded(event: SystemEvent): void {
		if (event.type !== 'COMBAT_ENDED') return;

		// Remove highlights and show winner
		this.showCombatResult(event.winnerId, event.loserId);
	}

	private handleRegenApplied(event: SystemEvent): void {
		if (event.type !== 'REGEN_APPLIED') return;

		const chara = Chara.getCharaById(event.unitId);
		if (chara) {
			this.animateHealing(chara, event.healing);
		}
	}

	private handlePoisonApplied(event: SystemEvent): void {
		if (event.type !== 'POISON_APPLIED') return;

		const chara = Chara.getCharaById(event.unitId);
		if (chara) {
			this.animateDamage(chara, event.damage, 'poison');
		}
	}

	private handleTimeoutDamageApplied(event: SystemEvent): void {
		if (event.type !== 'TIMEOUT_DAMAGE_APPLIED') return;

		const chara = Chara.getCharaById(event.unitId);
		if (chara) {
			this.animateDamage(chara, event.damage, 'timeout');
		}
	}

	// Animation helper methods
	private animateItemAppearance(chara: Chara.Chara): void {
		tween(this.scene, chara.sprite, { alpha: 0 }, { alpha: 1 }, 300);
	}

	private animateUnitPlacement(chara: Chara.Chara, slot: number): void {
		// Animate unit moving to its board position
		const targetPos = Board.getSlotPosition(slot);
		tween(this.scene, chara.sprite, chara.sprite, targetPos, 500);
	}

	private animateDamage(chara: Chara.Chara, damage: number, type: string = 'normal'): void {
		// Create damage text
		const damageText = this.scene.add.text(chara.sprite.x, chara.sprite.y - 20, `-${damage}`, {
			fontSize: '24px',
			color: type === 'poison' ? '#00ff00' : type === 'timeout' ? '#ff0000' : '#ffffff'
		});

		tween(this.scene, damageText, { y: damageText.y - 30, alpha: 1 }, { y: damageText.y - 60, alpha: 0 }, 1000, () => {
			damageText.destroy();
		});

		// Flash the sprite
		tween(this.scene, chara.sprite, { tint: 0xff0000 }, { tint: 0xffffff }, 200);
	}

	private animateHealing(chara: Chara.Chara, healing: number): void {
		// Create healing text
		const healText = this.scene.add.text(chara.sprite.x, chara.sprite.y - 20, `+${healing}`, {
			fontSize: '24px',
			color: '#00ff00'
		});

		tween(this.scene, healText, { y: healText.y - 30, alpha: 1 }, { y: healText.y - 60, alpha: 0 }, 1000, () => {
			healText.destroy();
		});

		// Glow effect
		tween(this.scene, chara.sprite, { tint: 0x00ff00 }, { tint: 0xffffff }, 500);
	}

	private highlightCombatants(attackerId: string, defenderId: string): void {
		const attacker = Chara.getCharaById(attackerId);
		const defender = Chara.getCharaById(defenderId);

		if (attacker) {
			tween(this.scene, attacker.sprite, { tint: 0xffff00 }, { tint: 0xffffff }, 300);
		}
		if (defender) {
			tween(this.scene, defender.sprite, { tint: 0xff0000 }, { tint: 0xffffff }, 300);
		}
	}

	private showCombatResult(winnerId?: string, loserId?: string): void {
		// Remove highlights and show result
		if (winnerId) {
			const winner = Chara.getCharaById(winnerId);
			if (winner) {
				tween(this.scene, winner.sprite, { scale: 1.2 }, { scale: 1 }, 500);
			}
		}
		if (loserId) {
			const loser = Chara.getCharaById(loserId);
			if (loser) {
				tween(this.scene, loser.sprite, { alpha: 0.5 }, { alpha: 1 }, 500);
			}
		}
	}

	private showPhaseTransition(): void {
		// Simple phase transition effect
		const overlay = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.5);
		overlay.setDepth(1000);

		tween(this.scene, overlay, { alpha: 0 }, { alpha: 0.5 }, 200, () => {
			setTimeout(() => {
				tween(this.scene, overlay, { alpha: 0.5 }, { alpha: 0 }, 200, () => {
					overlay.destroy();
				});
			}, 300);
		});
	}

	destroy(): void {
		// Clean up event listeners
		this.eventEmitter.off('SHOP_OPENED', this.handleShopOpened.bind(this));
		this.eventEmitter.off('UNIT_PURCHASED', this.handleUnitPurchased.bind(this));
		this.eventEmitter.off('SHOP_CLOSED', this.handleShopClosed.bind(this));
		this.eventEmitter.off('PHASE_SKIPPED', this.handlePhaseSkipped.bind(this));
		this.eventEmitter.off('UNIT_DAMAGED', this.handleUnitDamaged.bind(this));
		this.eventEmitter.off('UNIT_HEALED', this.handleUnitHealed.bind(this));
		this.eventEmitter.off('COMBAT_STARTED', this.handleCombatStarted.bind(this));
		this.eventEmitter.off('COMBAT_ENDED', this.handleCombatEnded.bind(this));
		this.eventEmitter.off('REGEN_APPLIED', this.handleRegenApplied.bind(this));
		this.eventEmitter.off('POISON_APPLIED', this.handlePoisonApplied.bind(this));
		this.eventEmitter.off('TIMEOUT_DAMAGE_APPLIED', this.handleTimeoutDamageApplied.bind(this));
	}
}