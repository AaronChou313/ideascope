import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4173/ideascope/', channel: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: 'IDEASCOPE_BASE_PATH=/ideascope/ npm run build && npm run preview -- --host 127.0.0.1 --base /ideascope/',
    url: 'http://127.0.0.1:4173/ideascope/',
    reuseExistingServer: false,
  },
});
