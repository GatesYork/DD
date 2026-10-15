import chromium from '@sparticuz/chromium';
import { spawnSync } from 'node:child_process';

const executablePath = await chromium.executablePath();
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: executablePath, EXPO_NO_TELEMETRY: '1', NEXT_TELEMETRY_DISABLED: '1' },
});
process.exit(result.status ?? 1);
