import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
	{
		ignores: [
			"dist/",
			"dist-electron/",
			"node_modules/",
			"webpack/",
			"playwright-report/",
			"test-results/",
			"coverage/",
			"*.config.js",
			"*.config.ts",
		],
	},
	{
		files: ["src/**/*.ts", "src/**/*.tsx"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: "./tsconfig.eslint.json",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"prefer-const": "error",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},
	{
		// Allow console in test and test-utils files
		files: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test-utils/**/*.ts", "e2e/**/*.ts"],
		rules: {
			"no-console": "warn",
		},
	},
	{
		files: ["src/Core/**/*.ts", "src/Core/**/*.tsx"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "phaser",
							message:
								"Core must stay framework-agnostic. Move Phaser-dependent code to Engine/ or Systems/.",
						},
					],
				},
			],
		},
	},
];
