import { test, expect } from '@playwright/test'
import site from '../site.config'

// This spec is the reason the config defines seven viewport projects.
// It runs in all of them.

for (const path of site.pages) {
  test.describe(`Responsive ${path}`, () => {
    test('no horizontal page scroll', async ({ page }, testInfo) => {
      await page.goto(path)
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth
        const offenders: string[] = []
        document.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect()
          if (r.right > docWidth + 1 || r.left < -1) {
            const id = el.id ? `#${el.id}` : ''
            const cls = el.className && typeof el.className === 'string'
              ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')}` : ''
            offenders.push(`${el.tagName.toLowerCase()}${id}${cls} (right: ${Math.round(r.right)}px vs ${docWidth}px)`)
          }
        })
        return {
          scrolls: document.documentElement.scrollWidth > docWidth + 1,
          docWidth,
          scrollWidth: document.documentElement.scrollWidth,
          offenders: [...new Set(offenders)].slice(0, 8),
        }
      })
      expect(
        overflow.scrolls,
        `${path} at ${testInfo.project.name} scrolls horizontally ` +
        `(${overflow.scrollWidth}px content in ${overflow.docWidth}px viewport). ` +
        `Offending elements:\n  ${overflow.offenders.join('\n  ')}`
      ).toBe(false)
    })

    test('tap targets meet minimum size', async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile viewports only')
      await page.goto(path)
      const min = site.design.minTapTargetPx
      const small = await page.evaluate((minPx) => {
        const out: string[] = []
        document.querySelectorAll('a, button, input[type=submit], input[type=button], [role=button]')
          .forEach(el => {
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return          // hidden
            const style = getComputedStyle(el)
            if (style.display === 'none' || style.visibility === 'hidden') return

            // WCAG 2.5.8 exempts links inline in a sentence, so a link inside a
            // paragraph, list item, or label is measured as prose, not as a control.
            if (el.tagName === 'A' && el.closest('p, li, label')) return

            // For a checkbox or radio, the effective tap target is the box plus its
            // label, because clicking the label toggles the control.
            let w = r.width, h = r.height
            const input = el as HTMLInputElement
            if (input.type === 'checkbox' || input.type === 'radio') {
              const label = input.id
                ? document.querySelector(`label[for="${input.id}"]`)
                : input.closest('label')
              if (label) {
                const lr = label.getBoundingClientRect()
                w = Math.max(r.right, lr.right) - Math.min(r.left, lr.left)
                h = Math.max(r.bottom, lr.bottom) - Math.min(r.top, lr.top)
              }
            }

            if (w < minPx || h < minPx) {
              out.push(`${el.tagName.toLowerCase()} "${(el.textContent||'').trim().slice(0,30)}" ${Math.round(w)}x${Math.round(h)}`)
            }
          })
        return [...new Set(out)].slice(0, 10)
      }, min)
      expect(
        small,
        `${path} at ${testInfo.project.name} has tap targets under ${min}px:\n  ${small.join('\n  ')}`
      ).toHaveLength(0)
    })

    test('form inputs are at least 16px to prevent iOS zoom', async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile viewports only')
      await page.goto(path)
      const minPx = site.design.minInputFontPx
      const tooSmall = await page.evaluate((min) => {
        const out: string[] = []
        document.querySelectorAll('input, select, textarea').forEach(el => {
          const size = parseFloat(getComputedStyle(el).fontSize)
          if (size < min) out.push(`${el.tagName.toLowerCase()}[name=${(el as HTMLInputElement).name || '?'}] ${size}px`)
        })
        return out
      }, minPx)
      expect(
        tooSmall,
        `${path} inputs below ${minPx}px will make iOS Safari zoom on focus:\n  ${tooSmall.join('\n  ')}`
      ).toHaveLength(0)
    })

    test('primary CTA is visible without scrolling', async ({ page }, testInfo) => {
      test.skip(path !== '/', 'home page only')
      await page.goto(path)
      const viewportHeight = page.viewportSize()!.height
      const ctaTop = await page.evaluate(() => {
        const cta = document.querySelector('main a[href], main button, a[href]')
        return cta ? cta.getBoundingClientRect().top : Infinity
      })
      expect(
        ctaTop,
        `${testInfo.project.name}: no call to action within the first screen (found at ${Math.round(ctaTop)}px, viewport is ${viewportHeight}px)`
      ).toBeLessThan(viewportHeight)
    })
  })
}
