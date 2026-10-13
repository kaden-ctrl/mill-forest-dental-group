import { test, expect } from '@playwright/test'
import site from '../site.config'

for (const path of site.pages) {
  test(`no console errors on ${path}`, async ({ page }) => {
    const errors: string[] = []
    const failedRequests: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', err => errors.push(`uncaught: ${err.message}`))
    page.on('requestfailed', req => {
      failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText})`)
    })

    await page.goto(path, { waitUntil: 'networkidle' })

    expect(errors, `${path} console errors:\n  ${errors.join('\n  ')}`).toHaveLength(0)
    expect(
      failedRequests,
      `${path} failed network requests:\n  ${failedRequests.join('\n  ')}`
    ).toHaveLength(0)
  })
}

test.describe('Analytics', () => {
  test.skip(!site.analyticsId, 'no analyticsId set in site.config.ts')

  test('the tag is present on every page', async ({ page }) => {
    const missing: string[] = []
    for (const path of site.pages) {
      await page.goto(path)
      const html = await page.content()
      if (!html.includes(site.analyticsId)) missing.push(path)
    }
    expect(
      missing,
      `analytics tag missing from: ${missing.join(', ')}. Check the shared layout, not just the home page.`
    ).toHaveLength(0)
  })

  test('analytics does not load before cookie consent', async ({ page, context }) => {
    await context.clearCookies()
    const analyticsRequests: string[] = []
    page.on('request', r => {
      if (/google-analytics|googletagmanager|analytics\.google/.test(r.url())) {
        analyticsRequests.push(r.url())
      }
    })
    await page.goto('/', { waitUntil: 'networkidle' })

    const hasBanner = await page.locator('[class*=cookie], [id*=cookie], [aria-label*=okie]').count()
    test.skip(hasBanner === 0, 'no cookie banner present, so consent gating does not apply')

    expect(
      analyticsRequests,
      `analytics fired before consent was given. The banner is decorative:\n  ${analyticsRequests.join('\n  ')}`
    ).toHaveLength(0)
  })
})
