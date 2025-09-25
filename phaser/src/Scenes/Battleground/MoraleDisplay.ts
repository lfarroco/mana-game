import Phaser from 'phaser';
import * as c from '../../constants/constants';
import { StylizedBar, createStylizedBar, updateStylizedBar } from './StylizedBar';
import { tween } from '../../Utils/animation';
import { cpuForce, playerForce } from '@Models/Entities/Force';
import { popText } from '@Systems/Chara/Animations/popText';
import { scene } from './BattlegroundScene';

type CombinedDisplay = {
	moraleBar: StylizedBar;
	shieldBar: StylizedBar;
};

let playerDisplay: CombinedDisplay | null = null;
let cpuDisplay: CombinedDisplay | null = null;

export function getMoraleBarPosition(forceId: string): { x: number, y: number } | null {
	if (forceId === c.FORCE_ID_PLAYER && playerDisplay) {
		return {
			x: playerDisplay.moraleBar.container.x,
			y: playerDisplay.moraleBar.container.y
		};
	} else if (forceId === c.FORCE_ID_CPU && cpuDisplay) {
		return {
			x: cpuDisplay.moraleBar.container.x,
			y: cpuDisplay.moraleBar.container.y
		};
	}
	return null;
}

export function getMoraleBarTipPosition(forceId: string): { x: number, y: number } {
	const barPosition = getMoraleBarPosition(forceId);
	if (!barPosition) {
		throw new Error(`Morale bar position not found for forceId: ${forceId}`);
	}

	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	const moralePercentage = Math.max(0, force.morale) / force.maxMorale;

	const tipY = barPosition.y + (1 - moralePercentage) * MORALE_BAR_HEIGHT;

	return {
		x: barPosition.x + MORALE_BAR_WIDTH / 2,
		y: tipY
	};
}

export function getShieldBarPosition(forceId: string): { x: number, y: number } | null {
	if (forceId === c.FORCE_ID_PLAYER && playerDisplay) {
		return {
			x: playerDisplay.shieldBar.container.x,
			y: playerDisplay.shieldBar.container.y
		};
	} else if (forceId === c.FORCE_ID_CPU && cpuDisplay) {
		return {
			x: cpuDisplay.shieldBar.container.x,
			y: cpuDisplay.shieldBar.container.y
		};
	}
	return null;
}

export function getShieldBarTipPosition(forceId: string): { x: number, y: number } {
	const barPosition = getShieldBarPosition(forceId);
	if (!barPosition) {
		throw new Error(`Shield bar position not found for forceId: ${forceId}`);
	};

	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	const shieldPercentage = Math.min(1.0, Math.max(0, force.shield) / force.maxMorale);

	const tipY = barPosition.y + (1 - shieldPercentage) * MORALE_BAR_HEIGHT;

	return {
		x: barPosition.x + MORALE_BAR_WIDTH / 2,
		y: tipY
	};
}

let previousPlayerMorale: number | null = null;
let previousCpuMorale: number | null = null;
let previousPlayerShield: number | null = null;
let previousCpuShield: number | null = null;

export function updateMoraleDisplay(payload: { forceId: string, newMorale: number, maxMorale: number, totalDamage?: number, damageType?: "poison" | "normal" | "timeout" }) {
	updateMoraleBar(payload.forceId);

	const targetDisplay = payload.forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay || !scene) return;

	const isPlayer = payload.forceId === c.FORCE_ID_PLAYER;
	const previousMorale = isPlayer ? previousPlayerMorale : previousCpuMorale;

	let displayValue: number;
	if (payload.totalDamage !== undefined && payload.totalDamage > 0) {
		displayValue = -payload.totalDamage;
	} else if (previousMorale !== null) {
		displayValue = payload.newMorale - previousMorale;
	} else {
		displayValue = 0;
	}

	if (isPlayer) {
		previousPlayerMorale = payload.newMorale;
	} else {
		previousCpuMorale = payload.newMorale;
	}

	if (displayValue !== 0) {
		const barHeight = MORALE_BAR_HEIGHT;
		const randomOffsetY = Math.random() * barHeight;
		const randomOffsetX = (Math.random() - 0.5) * 60;

		const popTextX = targetDisplay.moraleBar.container.x + randomOffsetX;
		const popTextY = targetDisplay.moraleBar.container.y + randomOffsetY;

		const deltaText = displayValue > 0 ? `+${displayValue}` : `${displayValue}`;

		let textType: "heal" | "damage" | "poison" | "timeout";
		if (displayValue > 0) {
			textType = "heal";
		} else if (payload.damageType === "poison") {
			textType = "poison";
		} else if (payload.damageType === "timeout") {
			textType = "timeout";
		} else {
			textType = "damage";
		}

		const textDirection = isPlayer ? "left" : "right";

		popText({
			x: popTextX,
			y: popTextY,
			text: deltaText,
			type: textType,
			direction: textDirection
		})

	}
}

export function handleShieldUpdated(payload: {
	forceId: string,
	newShield: number,
	maxShield: number,
	suppressPopText?: boolean,
	totalDamage?: number,
	damageType?: "poison" | "normal" | "timeout"
}) {

	const { forceId, newShield, maxShield, suppressPopText, totalDamage, damageType } = payload;

	updateShieldBar(forceId, newShield, maxShield);

	if (suppressPopText) {
		const isPlayer = forceId === c.FORCE_ID_PLAYER;
		if (isPlayer) {
			previousPlayerShield = newShield;
		} else {
			previousCpuShield = newShield;
		}
		return;
	}

	const targetDisplay = forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay || !scene) return;

	const isPlayer = forceId === c.FORCE_ID_PLAYER;
	const previousShield = isPlayer ? previousPlayerShield : previousCpuShield;

	let displayValue: number;
	if (totalDamage !== undefined && totalDamage > 0) {
		displayValue = -totalDamage;
	} else if (previousShield !== null) {
		const delta = newShield - previousShield;
		displayValue = delta;
	} else {
		displayValue = 0;
	}

	if (displayValue !== 0) {
		const barHeight = MORALE_BAR_HEIGHT;
		const randomOffsetY = Math.random() * barHeight;
		const randomOffsetX = (Math.random() - 0.5) * 60

		const popTextX = targetDisplay.shieldBar.container.x + randomOffsetX;
		const popTextY = targetDisplay.shieldBar.container.y + randomOffsetY;

		const deltaText = displayValue > 0 ? `+${displayValue}` : `${displayValue}`;

		let textType: "heal" | "damage" | "poison" | "shield" | "timeout";
		if (displayValue > 0) {
			textType = "shield";
		} else if (damageType === "poison") {
			textType = "poison";
		} else if (damageType === "timeout") {
			textType = "timeout";
		} else {
			textType = "damage";
		}

		const textDirection = isPlayer ? "left" : "right";

		popText({
			x: popTextX,
			y: popTextY,
			text: deltaText,
			type: textType,
			direction: textDirection
		})
	}

	if (isPlayer) {
		previousPlayerShield = payload.newShield;
	} else {
		previousCpuShield = payload.newShield;
	}
}

export const MORALE_BAR_WIDTH = 50;
export const MORALE_BAR_HEIGHT = 900;

function createCombinedDisplay(
	scene: Phaser.Scene,
	forceId: string,
): CombinedDisplay {
	let x = 0, y = 0;
	if (forceId === c.FORCE_ID_PLAYER) {
		x = c.MIDDLE_SCREEN_X - 100;
		y = c.MIDDLE_SCREEN_Y - MORALE_BAR_HEIGHT / 2;
	} else {
		x = c.MIDDLE_SCREEN_X + 60;
		y = c.MIDDLE_SCREEN_Y - MORALE_BAR_HEIGHT / 2;
	}

	const moraleBarColor = forceId === c.FORCE_ID_PLAYER ? 0x4CAF50 : 0xF44336;
	const moraleBar = createStylizedBar(scene, {
		x,
		y,
		width: MORALE_BAR_WIDTH,
		height: MORALE_BAR_HEIGHT,
		barColor: moraleBarColor,
		backgroundColor: 0x000000,
		backgroundOpacity: 0.2,
		textConfig: c.defaultTextConfig,
	});

	const shieldBarColor = 0xFFD700;
	const shieldBar = createStylizedBar(scene, {
		x,
		y,
		width: MORALE_BAR_WIDTH,
		height: MORALE_BAR_HEIGHT,
		barColor: shieldBarColor,
		backgroundColor: 0x000000,
		backgroundOpacity: 0,
		borderOpacity: 0,
		textConfig: c.defaultTextConfig,
	});

	shieldBar.container.setAlpha(1);
	shieldBar.barFill.alpha = 0.6;
	shieldBar.innerHighlight.alpha = 0.6;
	shieldBar.barFill.scaleY = 0;
	shieldBar.innerHighlight.scaleY = 0;

	return {
		moraleBar,
		shieldBar
	};
}

export function init(): void {
	destroy();

	playerDisplay = createCombinedDisplay(scene, c.FORCE_ID_PLAYER);
	if (playerDisplay) {
		playerDisplay.moraleBar.container.setVisible(true);
		playerDisplay.shieldBar.container.setVisible(true);
	}
	updateMoraleBar(playerForce.id);
	updateShieldBar(playerForce.id, 0, playerForce.maxMorale);

	cpuDisplay = createCombinedDisplay(scene, c.FORCE_ID_CPU);

}

export function showBars(): void {
	if (playerDisplay) {
		playerDisplay.moraleBar.container.setVisible(true);
		playerDisplay.shieldBar.container.setVisible(true);
	}
	if (cpuDisplay) {
		cpuDisplay.moraleBar.container.setVisible(true);
		cpuDisplay.shieldBar.container.setVisible(true);
	}
}

export function hideBars(): void {
	// playerbar: always visible
	if (cpuDisplay) {
		cpuDisplay.moraleBar.container.setVisible(false);
		cpuDisplay.shieldBar.container.setVisible(false);
	}
}

export async function fadeOutBars(): Promise<void> {
	const containers = [];
	if (cpuDisplay) {
		containers.push(cpuDisplay.moraleBar.container, cpuDisplay.shieldBar.container);
	}
	if (containers.length === 0) return;

	await tween({
		targets: containers,
		alpha: 0,
	});

	hideBars();

	containers.forEach(container => {
		container.setAlpha(1);
	});
}

export function updateMoraleBar(
	forceId: string,
): void {
	const targetDisplay = forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay) return;

	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	updateStylizedBar(targetDisplay.moraleBar, force.morale, force.maxMorale);
}

export function updateShieldBar(
	forceId: string,
	currentShield: number,
	maxShield: number,
): void {
	const targetDisplay = forceId === c.FORCE_ID_PLAYER ? playerDisplay : cpuDisplay;
	if (!targetDisplay) return;

	if (maxShield === 0) {
		targetDisplay.shieldBar.container.setVisible(false);
		return;
	}

	targetDisplay.shieldBar.container.setVisible(true);

	const force = forceId === c.FORCE_ID_PLAYER ? playerForce : cpuForce;
	const percentage = Math.min(1.0, Math.max(0, currentShield) / force.maxMorale); // Cap at 1.0

	const bar = targetDisplay.shieldBar;
	const duration = 200;

	bar.barFill.scene.tweens.killTweensOf([bar.barFill, bar.innerHighlight]);

	const originalHeight = (bar.container as any)._originalHeight || MORALE_BAR_HEIGHT;
	const fillHeight = originalHeight - 6; // INNER_PADDING * 2 = 6

	const targetScaleY = percentage; // Capped at 1.0
	const yOffset = 3 + fillHeight * (1 - targetScaleY); // INNER_PADDING = 3

	bar.barFill.scene.tweens.add({
		targets: [bar.barFill, bar.innerHighlight],
		scaleY: targetScaleY,
		y: yOffset,
		duration: duration,
	});
}

export function destroy(): void {
	if (playerDisplay) {
		playerDisplay.moraleBar.container.destroy();
		playerDisplay.shieldBar.container.destroy();
		playerDisplay = null;
	}
	if (cpuDisplay) {
		cpuDisplay.moraleBar.container.destroy();
		cpuDisplay.shieldBar.container.destroy();
		cpuDisplay = null;
	}

	previousPlayerMorale = null;
	previousCpuMorale = null;
	previousPlayerShield = null;
	previousCpuShield = null;
}
