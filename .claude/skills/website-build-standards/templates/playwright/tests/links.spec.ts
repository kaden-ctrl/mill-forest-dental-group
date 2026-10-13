import { test, expect } from '@playwright/test'
import site from '../site.config'

test.describe('Links', () => {
  test('no broken internal links', async ({ page, request }) => {
    const checked = new Map<string, number>()
    const broken: string[] = []

    for (const path of site.pages) {
      await page.goto(path)
      const hrefs = await page.locator('a[href]').evaluateAll(els =>
        els.map(e => (e as HTMLAnchorElement).getAttribute('href') || '')
      )
      for (const href of hrefs) {
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
        let target: string
        try {
          const u = new URL(href, site.baseURL)
          if (u.origin !== new URL(site.baseURL).origin) continue   // external, checked separately
          target = u.pathname + u.search
        } catch { continue }

        if (!checked.has(target)) {
          const r = await request.get(target, { failOnStatusCode: false })
          checked.set(target, r.status())
        }
        const status = checked.get(target)!
        if (status >= 400) broken.push(`${path} -> ${target} (${status})`)
      }
    }
    expect(
      [...new Set(broken)],
      `broken internal links:\n  ${[...new Set(broken)].join('\n  ')}`
    ).toHaveLength(0)
  })

  test('no placeholder href="#" links', async ({ page }) => {
    const found: string[] = []
    for (const path of site.pages) {
      await page.goto(path)
      const placeholders = await page.locator('a[href="#"]').evaluateAll(els =>
        els.map(e => (e.textContent || '').trim().slice(0, 40))
      )
      placeholders.forEach(t => found.push(`${path}: "${t}"`))
    }
    expect(found, `placeholder links still in the build:\n  ${found.join('\n  ')}`).toHaveLength(0)
  })

  test('tel: links use +1 and ten digits', async ({ page }) => {
    const bad: string[] = []
    for (const path of site.pages) {
      await page.goto(path)
      const tels = await page.locator('a[href^="tel:"]').evaluateAll(els =>
        els.map(e => e.getAttribute('href') || '')
      )
      for (const t of tels) {
        const digits = t.replace('tel:', '')
        if (!/^\+\d{10,15}$/.test(digits)) {
          bad.push(`${path}: ${t} (formatted numbers fail on some Android dialers, use +15205550100)`)
        }
      }
    }
    expect(bad, `malformed tel: links:\n  ${bad.join('\n  ')}`).toHaveLength(0)
  })

  test('mailto: links are well formed', async ({ page }) => {
    const bad: string[] = []
    for (const path of site.pages) {
      await page.goto(path)
      const mails = await page.locator('a[href^="mailto:"]').evaluateAll(els =>
        els.map(e => e.getAttribute('href') || '')
      )
      for (const m of mails) {
        const addr = m.replace('mailto:', '').split('?')[0]
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(addr)) bad.push(`${path}: ${m}`)
        if (/example\.(com|org)|yourdomain|placeholder/i.test(addr)) {
          bad.push(`${path}: ${m} is still a placeholder address`)
        }
      }
    }
    expect(bad, `malformed or placeholder mailto: links:\n  ${bad.join('\n  ')}`).toHaveLength(0)
  })

  test('legal pages are linked from every page footer', async ({ page }) => {
    const missing: string[] = []
    for (const path of site.pages) {
      await page.goto(path)
      for (const legal of ['privacy', 'terms']) {
        const count = await page.locator(`footer a[href*="${legal}"]`).count()
        if (count === 0) missing.push(`${path} footer has no ${legal} link`)
      }
    }
    expect(missing, missing.join('\n  ')).toHaveLength(0)
  })

  test('external links resolve', async ({ page, request }) => {
    const seen = new Set<string>()
    const broken: string[] = []
    for (const path of site.pages) {
      await page.goto(path)
      const hrefs = await page.locator('a[href^="http"]').evaluateAll(els =>
        els.map(e => (e as HTMLAnchorElement).href)
      )
      for (const href of hrefs) {
        const host = new URL(href).host
        if (host === new URL(site.baseURL).host) continue
        if (site.skipLinkHosts.some(h => host.includes(h))) continue
        if (seen.has(href)) continue
        seen.add(href)
        try {
          const r = await request.get(href, { failOnStatusCode: false, timeout: 15000 })
          if (r.status() >= 400) broken.push(`${href} (${r.status()}) linked from ${path}`)
        } catch (e) {
          broken.push(`${href} (unreachable) linked from ${path}`)
        }
      }
    }
    expect(broken, `broken external links:\n  ${broken.join('\n  ')}`).toHaveLength(0)
  })
})
