import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	timeout: 30 * 1000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:8080?speed=4',
		trace: 'on-first-retry',
		// Record video for failed tests
		video: 'retain-on-failure',
		// Take screenshot on failure
		screenshot: 'only-on-failure',
	},
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:8080',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
