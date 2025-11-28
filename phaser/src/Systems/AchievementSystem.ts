/**
 * Steam Achievement System
 * Handles unlocking achievements based on game completion with different cores
 */

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
 * Crystal types that can earn achievements
 */
export type CrystalType =
	| "mana_crystal"
	| "critical_crystal"
	| "protective_crystal"
	| "growth_crystal"
	| "purple_crystal"
	| "quickstone";

/**
 * Victory tier based on number of wins
 */
type VictoryTier = "bronze" | "silver" | "gold";

/**
 * Determine victory tier based on total wins
 * @param wins - Total number of wins achieved
 * @returns Victory tier or null if not enough wins
 */
function getVictoryTier(wins: number): VictoryTier | null {
	if (wins >= 10) return "gold";
	if (wins >= 8) return "silver";
	if (wins >= 5) return "bronze";
	return null;
}

/**
 * Get Steam achievement ID for a given crystal and victory tier
 * @param crystal - Crystal type
 * @param tier - Victory tier
 * @returns Achievement ID string
 */
function getAchievementId(crystal: CrystalType, tier: VictoryTier): string {
	return `${tier.toUpperCase()}_${crystal.toUpperCase()}`;
}

/**
 * Check if Steam achievements API is available
 * @returns True if Steam is available and ready
 */
function isSteamAvailable(): boolean {
	try {
		return !!(window.steamworks?.achievement);
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
		console.log(
			`[Achievement] Would unlock: ${achievementId} (Steam not available)`
		);
		return false;
	}

	try {
		const { achievement } = window.steamworks!;

		// Check if already unlocked
		if (achievement.isActivated(achievementId)) {
			console.log(`[Achievement] Already unlocked: ${achievementId}`);
			return false;
		}

		// Unlock the achievement
		const success = achievement.activate(achievementId);

		if (success) {
			console.log(`[Achievement] ✅ Unlocked: ${achievementId}`);
		} else {
			console.warn(`[Achievement] ❌ Failed to unlock: ${achievementId}`);
		}

		return success;
	} catch (error) {
		console.error(`[Achievement] Error unlocking ${achievementId}:`, error);
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
export function checkVictoryAchievements(
	wins: number,
	coreCardId: string
): void {
	console.log(
		`[Achievement] Checking victory achievements: ${wins} wins with ${coreCardId}`
	);

	// Determine victory tier
	const tier = getVictoryTier(wins);
	if (!tier) {
		console.log("[Achievement] Not enough wins for achievements (need 5+)");
		return;
	}

	// Check if the core is one of the achievement-eligible crystals
	const validCrystals: CrystalType[] = [
		"mana_crystal",
		"critical_crystal",
		"protective_crystal",
		"growth_crystal",
		"purple_crystal",
		"quickstone",
	];

	if (!validCrystals.includes(coreCardId as CrystalType)) {
		console.log(
			`[Achievement] Core ${coreCardId} is not eligible for achievements`
		);
		return;
	}

	const crystal = coreCardId as CrystalType;

	// Unlock achievements for this tier and all lower tiers
	// Example: Gold victory also unlocks Silver and Bronze
	const tiersToUnlock: VictoryTier[] = ["bronze"];
	if (tier === "silver" || tier === "gold") {
		tiersToUnlock.push("silver");
	}
	if (tier === "gold") {
		tiersToUnlock.push("gold");
	}

	// Unlock all relevant achievements
	for (const achievementTier of tiersToUnlock) {
		const achievementId = getAchievementId(crystal, achievementTier);
		unlockAchievement(achievementId);
	}
}
