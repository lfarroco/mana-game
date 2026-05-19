const BRONZE_VICTORY_WINS = 5;
const SILVER_VICTORY_WINS = 8;
const GOLD_VICTORY_WINS = 10;

export type MultiplayerVictoryTier = "bronze" | "silver" | "gold";

export const getMultiplayerVictoryTier = (wins: number): MultiplayerVictoryTier | null => {
	const normalizedWins = Math.max(0, Math.floor(Number(wins) || 0));

	if (normalizedWins >= GOLD_VICTORY_WINS) {
		return "gold";
	}
	if (normalizedWins >= SILVER_VICTORY_WINS) {
		return "silver";
	}
	if (normalizedWins >= BRONZE_VICTORY_WINS) {
		return "bronze";
	}

	return null;
};

export const getMultiplayerRatingDelta = (wins: number): number => {
	const victoryTier = getMultiplayerVictoryTier(wins);

	switch (victoryTier) {
		case "gold":
			return 6;
		case "silver":
			return 4;
		case "bronze":
			return 2;
		default:
			return 1;
	}
};
