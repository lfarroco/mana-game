module.exports = {
	testEnvironment: "jsdom",
	setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
	transform: {
		"^.+\\.(ts|tsx)$": "ts-jest",
	},
	moduleFileExtensions: ["ts", "tsx", "js"],
	testPathIgnorePatterns: [
		"/node_modules/",
		"/e2e/",
		"\\.e2e\\.",
	],
};
