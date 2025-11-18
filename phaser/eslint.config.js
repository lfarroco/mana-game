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
				project: "./tsconfig.json",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"no-console": "warn",
			"prefer-const": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},
];
