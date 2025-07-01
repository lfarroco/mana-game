module.exports = {
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.(ts|tsx)$": "ts-jest",
	},
	moduleFileExtensions: ["ts", "tsx", "js"],
	testPathIgnorePatterns: [
		"/node_modules/",
		"/e2e/",
		"*.e2e.*",
	],
};
