import { test, expect } from '@playwright/test'
import site from '../site.config'

// scan-copy.sh greps source files. This spec checks the RENDERED result, which
// catches violations that arrive through utility classes, CSS variables, or
// third-party components, and are therefore invisible to a source grep.

for (const path of site.pages) {
  test.describe(`Design ${path}`, () => {
    test('no pill-shaped buttons', async ({ page }) => {
      await page.goto(path)
      const max = site.design.maxBorderRadiusPx
      const pills = await page.evaluate((maxPx) => {
        const out: string[] = []
        document.querySelectorAll('button, a[class], input[type=submit], [role=button]').forEach(el => {
          const r = el.getBoundingClientRect()
          if (r.height === 0) return
          const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius)
          // A radius at or past half the height renders as a pill
          const isPill = radius >= r.height / 2 - 1 || radius > maxPx
          if (isPill && radius > maxPx) {
            out.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 25)}" radius ${Math.round(radius)}px on a ${Math.round(r.height)}px element`)
          }
        })
        return [...new Set(out)].slice(0, 10)
      }, max)
      expect(
        pills,
        `${path} has buttons with radius over ${max}px:\n  ${pills.join('\n  ')}`
      ).toHaveLength(0)
    })

    test('no purple or violet gradients', async ({ page }) => {
      await page.goto(path)
      const found = await page.evaluate(() => {
        const out: string[] = []
        const purple = (r: number, g: number, b: number) =>
          b > 120 && r > 80 && r < 200 && g < 110 && b > g + 50
        document.querySelectorAll('*').forEach(el => {
          const bg = getComputedStyle(el).backgroundImage
          if (!bg.includes('gradient')) return
          const colors = [...bg.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)]
          const hasPurple = colors.some(m => purple(+m[1], +m[2], +m[3]))
          if (hasPurple) {
            out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/)[0]}: ${bg.slice(0, 90)}`)
          }
        })
        return [...new Set(out)].slice(0, 6)
      })
      expect(
        found,
        `${path} renders a purple/violet gradient:\n  ${found.join('\n  ')}`
      ).toHaveLength(0)
    })

    test('no emoji in rendered copy', async ({ page }) => {
      await page.goto(path)
      const found = await page.evaluate(() => {
        const re = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
        const out: string[] = []
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = walk.nextNode())) {
          const t = n.textContent || ''
          if (re.test(t)) {
            const parent = (n.parentElement?.tagName || '?').toLowerCase()
            out.push(`<${parent}> "${t.trim().slice(0, 40)}"`)
          }
        }
        return [...new Set(out)].slice(0, 10)
      })
      expect(found, `${path} contains emoji:\n  ${found.join('\n  ')}`).toHaveLength(0)
    })

    test('no custom cursor', async ({ page }) => {
      await page.goto(path)
      const found = await page.evaluate(() => {
        const out: string[] = []
        document.querySelectorAll('*').forEach(el => {
          const c = getComputedStyle(el).cursor
          if (c.includes('url(')) out.push(`${el.tagName.toLowerCase()}: ${c.slice(0, 60)}`)
        })
        return [...new Set(out)].slice(0, 5)
      })
      expect(found, `${path} sets a custom cursor:\n  ${found.join('\n  ')}`).toHaveLength(0)
    })

    test('no animated counters', async ({ page }) => {
      await page.goto(path)
      // Scroll through the page to trigger any scroll-activated animation
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y)
          await new Promise(r => setTimeout(r, 60))
        }
      })

      const snapshot = () => page.evaluate(() => {
        const out: Record<string, string> = {}
        document.querySelectorAll('*').forEach((el, i) => {
          if (el.children.length) return
          const t = (el.textContent || '').trim()
          if (/^[\d,.]+[+%kKmM]?$/.test(t) && t.length < 12) out[`${el.tagName}-${i}`] = t
        })
        return out
      })

      const before = await snapshot()
      await page.waitForTimeout(1200)
      const after = await snapshot()

      const changed = Object.keys(before).filter(k => after[k] && after[k] !== before[k])
        .map(k => `${k}: ${before[k]} -> ${after[k]}`)
      expect(
        changed,
        `${path} has numbers that animate after load:\n  ${changed.join('\n  ')}\n` +
        `Real numbers are static text.`
      ).toHaveLength(0)
    })

    test('no more than two font families', async ({ page }) => {
      await page.goto(path)
      const families = await page.evaluate(() => {
        const set = new Set<string>()
        document.querySelectorAll('body, body *').forEach(el => {
          const f = getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '').trim()
          if (f && !/^(monospace|serif|sans-serif|ui-|system-ui|-apple-system)/.test(f)) set.add(f)
        })
        return [...set]
      })
      expect(
        families.length,
        `${path} loads ${families.length} font families: ${families.join(', ')}. Maximum is ${site.design.maxFontFamilies}.`
      ).toBeLessThanOrEqual(site.design.maxFontFamilies)
    })

    test('footer carries the agency credit, nofollowed', async ({ page }) => {
      test.skip(!site.credit.required, 'credit not required for this project')
      await page.goto(path)

      const link = page.locator(`footer a[href="${site.credit.href}"]`)
      await expect(
        link,
        `${path}: no footer link to ${site.credit.href}. New builds carry the ` +
        `agency credit. Set credit.required to false if this client declined it.`
      ).toHaveCount(1)

      const rel = (await link.getAttribute('rel')) || ''
      expect(
        rel,
        `${path}: the credit link has rel="${rel}". It needs nofollow. An identical ` +
        `sitewide footer link across a portfolio is the pattern Google's link spam ` +
        `guidance names, and the credit is for referral traffic, not PageRank.`
      ).toContain('nofollow')
      expect(rel, `${path}: credit link opening in a new tab needs noopener`).toContain('noopener')

      const context = (await page.locator('footer').innerText()).toLowerCase()
      expect(
        site.credit.text.test(context),
        `${path}: the footer links to ${site.credit.name} but does not say ` +
        `"Website by". "Created by" is ambiguous about what was created.`
      ).toBe(true)
    })

    test('the agency credit is not repeated in the navigation', async ({ page }) => {
      test.skip(!site.credit.required, 'credit not required for this project')
      await page.goto(path)
      const inNav = await page.locator(`header a[href="${site.credit.href}"], nav a[href="${site.credit.href}"]`).count()
      expect(
        inNav,
        `${path}: the agency credit appears in the navigation. Footer only, so it ` +
        `does not compete with the client's own branding.`
      ).toBe(0)
    })

    test('no AI tool badge or build credit', async ({ page }) => {
      await page.goto(path)
      const text = (await page.locator('body').innerText()).toLowerCase()
      const banned = ['made with ai', 'built with ai', 'built with claude', 'generated by ai',
                      'powered by ai', 'ai-generated', 'made with lovable', 'built with v0']
      const found = banned.filter(b => text.includes(b))
      expect(found, `${path} shows an AI build credit: ${found.join(', ')}`).toHaveLength(0)
    })

    test('no unsupported numeric claims in copy', async ({ page }) => {
      await page.goto(path)
      const text = await page.locator('body').innerText()
      const patterns: [RegExp, string][] = [
        [/\b\d{2,}\+?\s*(happy|satisfied|delighted)\s*(clients|customers|homeowners)/i, 'fake client count'],
        [/\b\d{2,}(\.\d+)?%\s*(satisfaction|success|happy)/i, 'fake satisfaction rate'],
        [/\btrusted by (thousands|hundreds|over \d+)/i, 'unverifiable trust claim'],
        [/\b\d+x\s*(faster|better|more)/i, 'unverifiable multiplier'],
        [/\baward[- ]winning\b/i, 'award claim'],
        [/\b#1\s+(in|for|rated)/i, 'ranking claim'],
      ]
      const found = patterns
        .filter(([re]) => re.test(text))
        .map(([re, label]) => `${label}: "${text.match(re)![0]}"`)
      expect(
        found,
        `${path} makes claims that need a client-provided source:\n  ${found.join('\n  ')}\n` +
        `If the client supplied these figures in writing, add the pattern to an allowlist. Otherwise delete them.`
      ).toHaveLength(0)
    })

    test('hero states what the business does', async ({ page }) => {
      test.skip(path !== '/', 'home page only')
      await page.goto(path)
      const h1 = (await page.locator('h1').first().innerText()).toLowerCase()
      const vague = [
        'transform your business', 'elevate your experience', 'unlock your potential',
        'take it to the next level', 'your success is our mission', 'quality you can trust',
        'experience the difference', 'welcome to our website', 'welcome to',
      ]
      const hit = vague.filter(v => h1.includes(v))
      expect(
        hit,
        `the h1 is vague: "${h1}". Hit: ${hit.join(', ')}. ` +
        `Use {SERVICE} in {LOCATION}, qualifier. A stranger should know what is sold in three seconds.`
      ).toHaveLength(0)
    })
  })
}
