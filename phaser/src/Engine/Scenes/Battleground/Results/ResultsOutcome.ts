import { WINS_TO_WIN_GAME } from "@Scenes/Battleground/Results/ResultsConfig";
import { GAME_CONFIG } from "@config";

export function determineGameOutcome(
	resultType: "victory" | "defeat",
	currentWins: number,
	currentLives: number
): { gameWon: boolean; gameOver: boolean } {
	// In demo mode, treat reaching MAX_VICTORIES as "game won" to trigger demo complete screen
	const demoComplete = resultType === "victory" && currentWins >= GAME_CONFIG.MAX_VICTORIES;
	const gameWon = resultType === "victory" && (currentWins === WINS_TO_WIN_GAME || demoComplete);
	const gameOver = resultType === "defeat" && currentLives <= 0;
	return { gameWon, gameOver };
}
