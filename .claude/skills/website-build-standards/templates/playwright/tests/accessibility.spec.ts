import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import site from '../site.config'

for (const path of site.pages) {
  test.describe(`Accessibility ${path}`, () => {
    test('no WCAG 2 AA violations', async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      const summary = results.violations.map(v =>
        `[${v.impact}] ${v.id}: ${v.help}\n` +
        v.nodes.slice(0, 3).map(n => `      ${n.target.join(' ')}`).join('\n')
      ).join('\n  ')

      // Assert on compact labels, not the raw violation objects. Passing the
      // objects makes Playwright print several KB of JSON per failure and buries
      // the summary above.
      const labels = results.violations.map(v => `${v.impact}:${v.id}`)
      expect(
        labels,
        `${path} has ${results.violations.length} accessibility violations:\n  ${summary}`
      ).toHaveLength(0)
    })

    test('color contrast passes', async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze()
      const detail = results.violations.flatMap(v =>
        v.nodes.map(n => `      ${n.target.join(' ')}: ${n.failureSummary?.split('\n')[1]?.trim()}`)
      ).join('\n')
      const failing = results.violations.flatMap(v => v.nodes.map(n => n.target.join(' ')))
      expect(
        failing,
        `${path} has contrast failures:\n${detail}`
      ).toHaveLength(0)
    })

    test('skip link is the first focusable element', async ({ page }) => {
      await page.goto(path)
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el ? { tag: el.tagName, text: (el.textContent || '').trim(), href: el.getAttribute('href') } : null
      })
      expect(focused, `${path}: nothing received focus on first Tab`).not.toBeNull()
      expect(
        focused!.text,
        `${path}: first focusable element is "${focused!.text}", expected a skip link`
      ).toMatch(/skip/i)
      expect(focused!.href, `${path}: skip link does not target a fragment`).toMatch(/^#/)
    })

    test('focus is visible on keyboard navigation', async ({ page }) => {
      await page.goto(path)
      // Tab to the first real interactive element past the skip link
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      const hasIndicator = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        if (!el || el === document.body) return true   // nothing focusable, not a failure here
        const s = getComputedStyle(el)
        const outlineVisible = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
        const hasRing = s.boxShadow !== 'none' || s.borderColor !== 'transparent'
        return outlineVisible || hasRing
      })
      expect(
        hasIndicator,
        `${path}: the focused element has no visible focus indicator. ` +
        `Check for "outline: none" without a :focus-visible replacement.`
      ).toBe(true)
    })

    test('heading levels descend without skipping', async ({ page }) => {
      await page.goto(path)
      const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(els =>
        els.map(e => ({ level: Number(e.tagName[1]), text: (e.textContent || '').trim().slice(0, 40) }))
      )
      const skips: string[] = []
      for (let i = 1; i < levels.length; i++) {
        if (levels[i].level - levels[i - 1].level > 1) {
          skips.push(`h${levels[i - 1].level} "${levels[i - 1].text}" -> h${levels[i].level} "${levels[i].text}"`)
        }
      }
      expect(skips, `${path} skips heading levels:\n  ${skips.join('\n  ')}`).toHaveLength(0)
    })

    test('respects prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(path)
      const animating = await page.evaluate(() => {
        const out: string[] = []
        document.querySelectorAll('*').forEach(el => {
          const s = getComputedStyle(el)
          const dur = parseFloat(s.animationDuration) || 0
          const tdur = parseFloat(s.transitionDuration) || 0
          if (dur > 0.1 || tdur > 0.1) {
            out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/)[0]} anim:${s.animationDuration} trans:${s.transitionDuration}`)
          }
        })
        return [...new Set(out)].slice(0, 8)
      })
      expect(
        animating,
        `${path} still animates under prefers-reduced-motion:\n  ${animating.join('\n  ')}\n` +
        `Add the @media (prefers-reduced-motion: reduce) block from the standards.`
      ).toHaveLength(0)
    })
  })
}
