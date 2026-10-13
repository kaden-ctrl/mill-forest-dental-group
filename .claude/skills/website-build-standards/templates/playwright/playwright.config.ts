import { defineConfig, devices } from '@playwright/test'
import site from './site.config'

// Only responsive.spec.ts needs to run in every viewport. Everything else is
// viewport-independent and runs once, on desktop-1280. Without this split the
// suite collects every spec in every project and skips most of them, which is
// slow and buries the real results.
const RESPONSIVE_ONLY = /responsive\.spec\.ts/

const viewports = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'tablet-768',   width: 768,  height: 1024 },
  { name: 'tablet-1024',  width: 1024, height: 768  },
  { name: 'mobile-375',   width: 375,  height: 812  },
  { name: 'mobile-390',   width: 390,  height: 844  },
  { name: 'mobile-414',   width: 414,  height: 896  },
]

const projects: any[] = [
  // Runs the whole suite.
  {
    name: 'desktop-1280',
    use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
  },
  // Run only the responsive checks.
  ...viewports.map(v => ({
    name: v.name,
    testMatch: RESPONSIVE_ONLY,
    use: { ...devices['Desktop Chrome'], viewport: { width: v.width, height: v.height } },
  })),
]

// WebKit is the only engine that reproduces real mobile Safari: input zoom,
// viewport units, momentum scrolling. It needs an extra download:
//   npx playwright install webkit
if (process.env.WEBKIT) {
  projects.push({
    name: 'mobile-safari',
    testMatch: RESPONSIVE_ONLY,
    use: { ...devices['iPhone 13'] },
  })
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: site.baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects,
})
