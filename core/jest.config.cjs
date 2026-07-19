module.exports = {
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	cacheDirectory: "<rootDir>/.cache/jest",
	transform: {
		"^.+\\.ts$": ["ts-jest", { useESM: true, diagnostics: false, tsconfig: { isolatedModules: true } }],
	},
	transformIgnorePatterns: [
		"node_modules/(?!uuid/)",
	],
	moduleFileExtensions: ["ts", "js"],
	testPathIgnorePatterns: [
		"/node_modules/",
	],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
};