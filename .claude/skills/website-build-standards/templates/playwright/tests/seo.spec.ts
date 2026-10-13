import { test, expect } from '@playwright/test'
import site from '../site.config'

// SEO is viewport-independent. Run once.
const pages = site.pages.filter(p => !site.skipSeoChecks.includes(p))

for (const path of pages) {
  test.describe(`SEO ${path}`, () => {
    test('title is unique, present, and 50 to 60 characters', async ({ page }) => {
      await page.goto(path)
      const title = await page.title()
      expect(title, `${path} has no <title>`).toBeTruthy()
      expect(title, `${path} title still contains a placeholder token`).not.toMatch(/\{\{|lorem|untitled/i)
      expect(
        title.length,
        `${path} title is ${title.length} chars, want 50-60: "${title}"`
      ).toBeGreaterThanOrEqual(50)
      expect(
        title.length,
        `${path} title is ${title.length} chars, want 50-60: "${title}"`
      ).toBeLessThanOrEqual(60)
    })

    test('meta description is present and 140 to 155 characters', async ({ page }) => {
      await page.goto(path)
      const desc = await page.getAttribute('meta[name="description"]', 'content')
      expect(desc, `${path} has no meta description`).toBeTruthy()
      const n = desc!.length
      expect(n, `${path} description is ${n} chars, want 140-155`).toBeGreaterThanOrEqual(140)
      expect(n, `${path} description is ${n} chars, want 140-155`).toBeLessThanOrEqual(155)
    })

    test('canonical is present, absolute, and self-referencing', async ({ page }) => {
      await page.goto(path)
      const canonical = await page.getAttribute('link[rel="canonical"]', 'href')
      expect(canonical, `${path} has no canonical link`).toBeTruthy()
      expect(canonical, `${path} canonical is not absolute: ${canonical}`).toMatch(/^https?:\/\//)
      const canonPath = new URL(canonical!).pathname.replace(/\/$/, '') || '/'
      const wantPath = path.replace(/\/$/, '') || '/'
      expect(canonPath, `${path} canonical points at ${canonPath}`).toBe(wantPath)
    })

    test('exactly one h1', async ({ page }) => {
      await page.goto(path)
      const count = await page.locator('h1').count()
      expect(count, `${path} has ${count} h1 elements, want exactly 1`).toBe(1)
    })

    test('open graph tags are complete', async ({ page }) => {
      await page.goto(path)
      for (const prop of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image']) {
        const v = await page.getAttribute(`meta[property="${prop}"]`, 'content')
        expect(v, `${path} is missing ${prop}`).toBeTruthy()
      }
      const card = await page.getAttribute('meta[name="twitter:card"]', 'content')
      expect(card, `${path} twitter:card should be summary_large_image`).toBe('summary_large_image')
    })

    test('html lang attribute is set', async ({ page }) => {
      await page.goto(path)
      const lang = await page.getAttribute('html', 'lang')
      expect(lang, `${path} has no lang attribute on <html>`).toBeTruthy()
    })

    test('no placeholder content in rendered text', async ({ page }) => {
      await page.goto(path)
      const body = (await page.locator('body').innerText()).toLowerCase()
      for (const bad of ['lorem ipsum', '{{', 'todo:', 'fixme', 'placeholder text']) {
        expect(body.includes(bad), `${path} still contains "${bad}"`).toBe(false)
      }
    })

    test('all images have alt attributes', async ({ page }) => {
      await page.goto(path)
      const missing = await page.locator('img:not([alt])').evaluateAll(
        els => els.map(e => (e as HTMLImageElement).src)
      )
      expect(missing, `${path} images missing alt: ${missing.join(', ')}`).toHaveLength(0)
    })

    test('all images have explicit dimensions', async ({ page }) => {
      await page.goto(path)
      const missing = await page.locator('img').evaluateAll(els =>
        els.filter(e => !e.getAttribute('width') || !e.getAttribute('height'))
           .map(e => (e as HTMLImageElement).src)
      )
      expect(
        missing,
        `${path} images without width/height (causes layout shift): ${missing.join(', ')}`
      ).toHaveLength(0)
    })

    test('external links carry rel=noopener', async ({ page }) => {
      await page.goto(path)
      const unsafe = await page.locator('a[target="_blank"]').evaluateAll(els =>
        els.filter(e => !(e.getAttribute('rel') || '').includes('noopener'))
           .map(e => (e as HTMLAnchorElement).href)
      )
      expect(unsafe, `${path} target=_blank without rel=noopener: ${unsafe.join(', ')}`).toHaveLength(0)
    })
  })
}

test.describe('Site-level SEO', () => {
  test('all page titles are unique across the site', async ({ page }) => {
    const seen = new Map<string, string>()
    for (const path of pages) {
      await page.goto(path)
      const t = await page.title()
      if (seen.has(t)) {
        throw new Error(`Duplicate title "${t}" on ${path} and ${seen.get(t)}`)
      }
      seen.set(t, path)
    }
  })

  test('all meta descriptions are unique across the site', async ({ page }) => {
    const seen = new Map<string, string>()
    for (const path of pages) {
      await page.goto(path)
      const d = (await page.getAttribute('meta[name="description"]', 'content')) || ''
      if (d && seen.has(d)) {
        throw new Error(`Duplicate description on ${path} and ${seen.get(d)}`)
      }
      seen.set(d, path)
    }
  })

  test('root files all return 200', async ({ request }) => {
    const failures: string[] = []
    for (const f of site.rootFiles) {
      const r = await request.get(f)
      if (r.status() !== 200) failures.push(`${f} -> ${r.status()}`)
    }
    expect(failures, `missing root files: ${failures.join(', ')}`).toHaveLength(0)
  })

  test('404 page returns status 404, not 200', async ({ request }) => {
    const r = await request.get('/this-page-definitely-does-not-exist-9f3a')
    expect(r.status(), 'a soft 404 returning 200 gets the error page indexed').toBe(404)
  })

  test('robots.txt references the sitemap', async ({ request }) => {
    const r = await request.get('/robots.txt')
    expect(r.status()).toBe(200)
    const body = await r.text()
    expect(body, 'robots.txt does not reference a sitemap').toMatch(/Sitemap:\s*https?:\/\//i)
  })

  test('every sitemap URL returns 200', async ({ request }) => {
    const r = await request.get('/sitemap.xml')
    expect(r.status(), 'sitemap.xml is missing').toBe(200)
    const xml = await r.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    expect(locs.length, 'sitemap contains no URLs').toBeGreaterThan(0)

    // Only enforce https once the site is actually served over https, so the
    // same suite can run against a local dev server.
    const enforceHttps = site.baseURL.startsWith('https://')
    const failures: string[] = []
    for (const loc of locs) {
      if (enforceHttps && /^http:\/\//.test(loc)) failures.push(`${loc} -> uses http, not https`)
      const res = await request.get(new URL(loc).pathname, { failOnStatusCode: false })
      if (res.status() !== 200) failures.push(`${loc} -> ${res.status()}`)
    }
    expect(failures, `broken sitemap entries:\n${failures.join('\n')}`).toHaveLength(0)
  })

  test('sitemap excludes thank-you and error pages', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    const bad = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(m => m[1])
      .filter(u => /thank|thanks|404|error|admin/i.test(u))
    expect(bad, `sitemap should not list: ${bad.join(', ')}`).toHaveLength(0)
  })

  test('structured data is present and valid JSON', async ({ page }) => {
    await page.goto('/')
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(blocks.length, 'home page has no JSON-LD structured data').toBeGreaterThan(0)
    const types: string[] = []
    for (const b of blocks) {
      let parsed: any
      expect(() => { parsed = JSON.parse(b) }, `invalid JSON-LD: ${b.slice(0, 80)}`).not.toThrow()
      types.push(parsed['@type'])
    }
    expect(
      types.some(t => ['Organization', 'LocalBusiness'].includes(t)),
      `home page JSON-LD types are ${types.join(', ')}, want Organization or LocalBusiness`
    ).toBe(true)
  })
})
