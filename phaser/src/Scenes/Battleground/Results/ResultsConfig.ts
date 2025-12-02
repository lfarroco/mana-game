
export const WINS_TO_WIN_GAME = 10;
export const INFINITE_MODE_THRESHOLD = 10;

export const GOLD_VICTORY_THRESHOLD = 10;
export const SILVER_VICTORY_THRESHOLD = 8;
export const BRONZE_VICTORY_THRESHOLD = 5;

export const VICTORY_MESSAGES = {
	infinite: (wins: number) => `You've won ${wins} matches so far - keep it up!`,
	standard: "Congratulations! You have won the battle.",
};

export const DEFEAT_MESSAGES = {
	infinite: (wins: number) => `You defeated ${wins} teams in your journey, great job!`,
	standard: "Thanks for playing! Come back for more updates!",
};

export type VictoryTier = {
	message: string;
	color: string;
};

export function getVictoryTier(wins: number, isGameOver: boolean): VictoryTier {
	if (wins >= GOLD_VICTORY_THRESHOLD) {
		if (isGameOver) {
			return { message: "Run Complete", color: "#F44336" };
		}
		return { message: "Gold Victory", color: "#FFD700" };
	}

	if (wins >= SILVER_VICTORY_THRESHOLD) {
		return { message: "Silver Victory", color: "#C0C0C0" };
	}

	if (wins >= BRONZE_VICTORY_THRESHOLD) {
		return { message: "Bronze Victory", color: "#CD7F32" };
	}

	return { message: "Better luck next time!", color: "#FFFFFF" };
}
