import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

/**
 * Dedicated Playwright config for the content / SEO / a11y "gates".
 *
 * These specs are deliberately scoped to ./tests/gates so they do not collide
 * with the Payload blank-template e2e suite (./tests/e2e, run via the main
 * playwright.config.ts). They run against a PRODUCTION build on port 3100
 * (a dedicated port so concurrent Conductor workspaces holding :3000 don't
 * collide — and reuseExistingServer won't accidentally grab a foreign server).
 *
 * Set GATES_BASE_URL to run them against an already-deployed URL instead —
 * `GATES_BASE_URL=https://mento-astro.vercel.app bun run test:gates`. The local
 * default builds and boots a server, which needs a reachable database; some
 * gates (the media one) have nothing to assert without it and skip. There is no
 * CI running this suite, so pointing it at a deployment is the only way those
 * gates execute at all.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
const externalBaseURL = process.env.GATES_BASE_URL?.trim()

export default defineConfig({
  testDir: './tests/gates',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'list',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: externalBaseURL ?? 'http://localhost:3100',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  /* Nothing to boot when we are testing a deployment someone else is hosting. */
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'bun run build && bun run start -- --port 3100',
        url: 'http://localhost:3100',
        timeout: 180000,
        reuseExistingServer: !process.env.CI,
      },
})
