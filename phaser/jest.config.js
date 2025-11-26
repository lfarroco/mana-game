module.exports = {
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.(ts|tsx)$": "ts-jest",
	},
	moduleFileExtensions: ["ts", "tsx", "js"],
	testPathIgnorePatterns: [
		"/node_modules/",
		"/e2e/",
		"\\.e2e\\.",
	],
	moduleNameMapper: {
		"^@Models/(.*)$": "<rootDir>/src/Models/$1",
		"^@Scenes/(.*)$": "<rootDir>/src/Scenes/$1",
		"^@Systems/(.*)$": "<rootDir>/src/Systems/$1",
		"^@UI/(.*)$": "<rootDir>/src/UI/$1",
		"^@Utils/(.*)$": "<rootDir>/src/Utils/$1",
		"^@Constants/(.*)$": "<rootDir>/src/Constants/$1",
		"^@PhaserIO$": "<rootDir>/src/phaser.io.ts",
		"^@Components/(.*)$": "<rootDir>/src/Components/$1",
		"^@Shaders/(.*)$": "<rootDir>/src/Shaders/$1",
	},
};
