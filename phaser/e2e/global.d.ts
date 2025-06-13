interface GameTestHelpers {
	getGameState: () => any;
	triggerShopPhase: () => void;
	triggerCombatPhase: () => void;
	getPlayerGold: () => number;
	getPlayerUnits: () => any[];
}

interface Window {
	game: any;
	gameTestHelpers: GameTestHelpers;
}
