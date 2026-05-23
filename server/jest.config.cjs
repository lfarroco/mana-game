module.exports = {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	roots: ["<rootDir>/src"],
	testMatch: ["**/*.test.ts"],
	moduleNameMapper: {
		"^@game/(.*)$": "<rootDir>/../phaser/src/$1",
		"^@Core/(.*)$": "<rootDir>/../phaser/src/Core/$1",
		"^@Models/(.*)$": "<rootDir>/../phaser/src/Models/$1",
		"^@Data/(.*)$": "<rootDir>/../phaser/src/Data/$1",
		"^@Utils/(.*)$": "<rootDir>/../phaser/src/Utils/$1",
		"^@i18n/(.*)$": "<rootDir>/../phaser/src/i18n/$1",
		"^@Systems/(.*)$": "<rootDir>/../phaser/src/Systems/$1",
		"^@TriggerSystem/(.*)$": "<rootDir>/../phaser/src/TriggerSystem/$1",
		"^@Storage/(.*)$": "<rootDir>/../phaser/src/Storage/$1",
		"^@Effects/(.*)$": "<rootDir>/../phaser/src/Effects/$1",
		"^@Engine/(.*)$": "<rootDir>/../phaser/src/Engine/$1",
		"^@Scenes/(.*)$": "<rootDir>/../phaser/src/Engine/Scenes/$1",
		"^@UI/(.*)$": "<rootDir>/../phaser/src/UI/$1",
		"^@Constants/(.*)$": "<rootDir>/../phaser/src/Constants/$1",
		"^@Components/(.*)$": "<rootDir>/../phaser/src/Components/$1",
		"^@Shaders/(.*)$": "<rootDir>/../phaser/src/Shaders/$1",
		"^@Multiplayer/(.*)$": "<rootDir>/../phaser/src/Multiplayer/$1",
		"^@Game/(.*)$": "<rootDir>/../phaser/src/Game/$1",
		"^@lib/(.*)$": "<rootDir>/../phaser/src/lib/$1",
		"^Client/(.*)$": "<rootDir>/../phaser/src/Client/$1",
		"^TriggerSystem/(.*)$": "<rootDir>/../phaser/src/TriggerSystem/$1",
		"^@test-utils/(.*)$": "<rootDir>/../phaser/src/test-utils/$1",
		"^@config$": "<rootDir>/../phaser/src/config.ts",
		"^@main$": "<rootDir>/../phaser/src/main.ts",
		"^@assets$": "<rootDir>/../phaser/src/assets.ts",
		"^@utils$": "<rootDir>/../phaser/src/utils.ts",
		"^@PhaserIO$": "<rootDir>/../phaser/src/phaser.io.ts",
		"^(\\.{1,2}/.*)\\.js$": "$1"
	},
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				useESM: true,
				tsconfig: "<rootDir>/tsconfig.json"
			}
		]
	},
	setupFiles: ["<rootDir>/src/mocks.ts"]
};
