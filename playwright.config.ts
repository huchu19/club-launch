import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3300)

// e2e always runs against a production build with deterministic demo content
// and AI fixtures (AI_MOCK=1), never real services.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // SIGTERM lets `next start` stop its detached server process too.
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    env: {
      AI_MOCK: '1',
      CONTENT_MOCK: '1',
      CRM_ADAPTER: 'mock',
      ADMIN_USER: 'admin',
      ADMIN_PASSWORD: 'e2e-password',
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
})
