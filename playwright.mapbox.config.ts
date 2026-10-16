import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/mapbox', outputDir: './test-results-mapbox', workers: 1, timeout: 30000,
  use: { trace: 'retain-on-failure', baseURL: 'http://localhost:8082', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {} },
  webServer: { command: 'npm exec --workspace @dd/mobile -- expo start --web --port 8082', url: 'http://localhost:8082', timeout: 120000, env: { EXPO_NO_TELEMETRY: '1', EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'pk.test', CI: '1' } },
});
