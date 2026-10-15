import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 30000,
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {} },
  webServer: [
    { command: 'npm run dev:mobile', url: 'http://localhost:8081', timeout: 120000, reuseExistingServer: !process.env.CI, env: { EXPO_NO_TELEMETRY: '1', CI: '1' } },
    { command: 'npm run dev:admin', url: 'http://localhost:3000', timeout: 120000, reuseExistingServer: !process.env.CI, env: { NEXT_TELEMETRY_DISABLED: '1' } },
  ],
});
