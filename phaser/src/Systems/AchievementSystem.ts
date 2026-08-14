/**
 * Steam Achievement System
 * Handles unlocking achievements based on game completion with different cores
 */

import { getAchievementUnlocks } from "@game/Achievements/achievements";
import { GAME_CONFIG } from "@config";
// Declare window.steamworks type for TypeScript
declare const window: Window & {
	steamworks?: {
		achievement: {
			activate(achievementId: string): boolean;
			isActivated(achievementId: string): boolean;
		};
	};
};

/**
 * Check if Steam achievements API is available
 * @returns True if Steam is available and ready
 */
function isSteamAvailable(): boolean {
	try {
		return !!window.steamworks?.achievement;
	} catch {
		return false;
	}
}

/**
 * Unlock a single Steam achievement
 * @param achievementId - The Steam achievement ID to unlock
 * @returns True if successfully unlocked, false otherwise
 */
function unlockAchievement(achievementId: string): boolean {
	if (!isSteamAvailable()) {
		return false;
	}

	try {
		const { achievement } = window.steamworks!;

		// Check if already unlocked
		if (achievement.isActivated(achievementId)) {
			return false;
		}

		// Unlock the achievement
		const success = achievement.activate(achievementId);

		if (success) {
			console.debug("AchievementSystem", `[Achievement] ✅ Unlocked: ${achievementId}`);
		} else {
			console.warn("AchievementSystem", `[Achievement] ❌ Failed to unlock: ${achievementId}`);
		}

		return success;
	} catch (error) {
		console.error("AchievementSystem", `[Achievement] Error unlocking ${achievementId}:`, error);
		return false;
	}
}

/**
 * Check and unlock victory achievements for the player's core crystal
 * Called when the player completes the game
 *
 * @param wins - Total number of wins achieved in the game
 * @param coreCardId - The card ID of the player's core crystal
 */
export function checkVictoryAchievements(wins: number, coreCardId: string): void {
	const achievementIds = getAchievementUnlocks(wins, coreCardId, {
		enableAchievements: GAME_CONFIG.ENABLE_ACHIEVEMENTS,
	});
	for (const achievementId of achievementIds) {
		unlockAchievement(achievementId);
	}
}
