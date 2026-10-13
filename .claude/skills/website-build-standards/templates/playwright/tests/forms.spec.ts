import { test, expect } from '@playwright/test'
import site from '../site.config'

const f = site.form

test.describe('Contact form', () => {
  test('form exists on the contact page', async ({ page }) => {
    await page.goto(f.page)
    await expect(page.locator(f.selector), `no form matching "${f.selector}" on ${f.page}`).toBeVisible()
  })

  test('every input has an associated label', async ({ page }) => {
    await page.goto(f.page)
    const unlabelled = await page.locator(`${f.selector} input, ${f.selector} textarea, ${f.selector} select`)
      .evaluateAll(els => els
        .filter(el => {
          const input = el as HTMLInputElement
          if (input.type === 'hidden') return false
          // Honeypot fields are intentionally hidden from assistive tech
          if (input.closest('[aria-hidden="true"]')) return false
          if (input.id && document.querySelector(`label[for="${input.id}"]`)) return false
          if (input.closest('label')) return false
          if (input.getAttribute('aria-label')) return false
          if (input.getAttribute('aria-labelledby')) return false
          return true
        })
        .map(el => `${el.tagName.toLowerCase()}[name=${(el as HTMLInputElement).name || '?'}]`)
      )
    expect(
      unlabelled,
      `inputs without a label (a placeholder is not a label): ${unlabelled.join(', ')}`
    ).toHaveLength(0)
  })

  test('autocomplete attributes are set on standard fields', async ({ page }) => {
    await page.goto(f.page)
    const missing = await page.locator(`${f.selector} input`).evaluateAll(els => els
      .filter(el => {
        const i = el as HTMLInputElement
        if (['hidden', 'checkbox', 'radio', 'submit'].includes(i.type)) return false
        if (i.closest('[aria-hidden="true"]')) return false
        return !i.getAttribute('autocomplete')
      })
      .map(el => (el as HTMLInputElement).name)
    )
    expect(missing, `inputs missing autocomplete: ${missing.join(', ')}`).toHaveLength(0)
  })

  test('submit button names the action, not the interface', async ({ page }) => {
    await page.goto(f.page)
    const label = (await page.locator(`${f.selector} button[type=submit], ${f.selector} button:not([type])`).first().innerText()).trim()
    expect(label, 'submit button has no text').toBeTruthy()
    expect(
      label.toLowerCase(),
      `button label is "${label}". "Submit" names the interface, not the action. Use "Send message".`
    ).not.toBe('submit')
    expect(label, `button label "${label}" does not name the action`).toMatch(f.submitText)
  })

  test('consent checkbox is present and links to the privacy policy', async ({ page }) => {
    await page.goto(f.page)
    const consent = page.locator(`${f.selector} input[type=checkbox][name="${f.fields.consent}"]`)
    await expect(consent, 'no consent checkbox on a form collecting personal data').toHaveCount(1)
    await expect(consent, 'consent checkbox is not required').toHaveAttribute('required', '')
    const link = page.locator(`${f.selector} a[href*="privacy"]`)
    await expect(link, 'consent text does not link to the privacy policy').toHaveCount(1)
  })

  test('honeypot field is hidden from sight and from assistive tech', async ({ page }) => {
    await page.goto(f.page)
    const hp = page.locator(`${f.selector} input[name="${f.honeypotField}"]`)
    const count = await hp.count()
    test.skip(count === 0, `no honeypot field named "${f.honeypotField}" configured`)
    // Off-screen positioning is the recommended technique, and Playwright reports
    // such an element as "visible", so check perceivability directly.
    const hidden = await hp.evaluate(el => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const offScreen = r.right < 0 || r.bottom < 0 ||
        r.left > document.documentElement.clientWidth
      return s.display === 'none' || s.visibility === 'hidden' ||
        s.opacity === '0' || (r.width === 0 && r.height === 0) || offScreen
    })
    expect(hidden, 'honeypot field is perceivable to real users').toBe(true)

    const ariaHidden = await hp.evaluate(el => !!el.closest('[aria-hidden="true"]'))
    expect(ariaHidden, 'honeypot is exposed to screen readers, which will trip real users').toBe(true)

    const tabindex = await hp.getAttribute('tabindex')
    expect(tabindex, 'honeypot must have tabindex="-1" so keyboard users skip it').toBe('-1')
  })

  // Shared assertion: a rejected submission must keep the user on the form with a
  // visible error. Navigating away to a raw JSON body is the most common form bug.
  async function expectRejectedInPlace(page: any, label: string) {
    await page.waitForTimeout(400)
    const body = (await page.locator('body').innerText()).trim()
    const looksLikeRawJson = /^\{[\s\S]*\}$/.test(body) || body.startsWith('{"')
    expect(
      looksLikeRawJson,
      `${label}: the form posted natively and showed the user a raw response body. ` +
      `Add the client-side submit handler from the standards so the user stays on the page.`
    ).toBe(false)

    const stillOnForm = await page.locator(f.selector).count() > 0
    expect(stillOnForm, `${label}: the user was navigated away from the form`).toBe(true)

    const invalid = await page.locator(`${f.selector} :invalid`).count()
    const errorShown = await page.locator('[role=alert]:visible, .error:visible, [aria-invalid="true"]').count()
    const status = (await page.locator('[role=status]').innerText().catch(() => '')).trim()
    expect(
      invalid > 0 || errorShown > 0 || status.length > 0,
      `${label}: no error state was shown. The user cannot tell what went wrong.`
    ).toBe(true)
  }

  test('empty submission is rejected', async ({ page }) => {
    await page.goto(f.page)
    await page.locator(`${f.selector} button[type=submit], ${f.selector} button:not([type])`).first().click()
    await expectRejectedInPlace(page, 'empty submission')
  })

  test('invalid email is rejected', async ({ page }) => {
    await page.goto(f.page)
    await page.fill(`${f.selector} [name="${f.fields.name}"]`, 'Test Person')
    await page.fill(`${f.selector} [name="${f.fields.email}"]`, 'notanemail')
    await page.fill(`${f.selector} [name="${f.fields.message}"]`, 'Testing the form.')
    await page.locator(`${f.selector} button[type=submit], ${f.selector} button:not([type])`).first().click()
    await expectRejectedInPlace(page, 'invalid email')
  })

  test('submission without consent is rejected', async ({ page }) => {
    await page.goto(f.page)
    const consent = page.locator(`${f.selector} input[name="${f.fields.consent}"]`)
    test.skip(await consent.count() === 0, 'no consent checkbox')
    await page.fill(`${f.selector} [name="${f.fields.name}"]`, 'Test Person')
    await page.fill(`${f.selector} [name="${f.fields.email}"]`, 'test@example.com')
    await page.fill(`${f.selector} [name="${f.fields.message}"]`, 'Testing the form.')
    await page.locator(`${f.selector} button[type=submit], ${f.selector} button:not([type])`).first().click()
    await expectRejectedInPlace(page, 'missing consent')
  })

  test('valid submission succeeds without leaving the page', async ({ page }) => {
    await page.goto(f.page)
    await page.fill(`${f.selector} [name="${f.fields.name}"]`, 'Test Person')
    await page.fill(`${f.selector} [name="${f.fields.email}"]`, 'test@example.com')
    await page.fill(`${f.selector} [name="${f.fields.message}"]`, 'Testing the contact form end to end.')
    const consent = page.locator(`${f.selector} input[name="${f.fields.consent}"]`)
    if (await consent.count()) await consent.check()
    await page.locator(`${f.selector} button[type=submit], ${f.selector} button:not([type])`).first().click()
    await page.waitForTimeout(600)

    const body = (await page.locator('body').innerText()).trim()
    expect(
      /^\{[\s\S]*\}$/.test(body),
      'a valid submission showed the user a raw JSON response'
    ).toBe(false)

    const status = (await page.locator('[role=status]').innerText().catch(() => '')).trim()
    const onThankYou = /thank|thanks|received/i.test(body)
    expect(
      status.length > 0 || onThankYou,
      'a valid submission produced no confirmation. The user cannot tell it worked.'
    ).toBe(true)
  })

  test('form is fully keyboard navigable', async ({ page }) => {
    await page.goto(f.page)
    await page.locator(`${f.selector} [name="${f.fields.name}"]`).focus()
    const reached: string[] = []
    for (let i = 0; i < 12; i++) {
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        return el ? `${el.tagName.toLowerCase()}[${(el as HTMLInputElement).name || el.getAttribute('type') || ''}]` : 'none'
      })
      reached.push(info)
      if (info.startsWith('button')) break
      await page.keyboard.press('Tab')
    }
    expect(
      reached.some(r => r.startsWith('button')),
      `could not reach the submit button by keyboard. Tab order reached: ${reached.join(' -> ')}`
    ).toBe(true)
  })
})

// Endpoint-level tests. These prove server-side validation exists, which is the
// control that matters. Client-side validation is only a convenience.
test.describe('Form endpoint', () => {
  test.skip(!f.endpoint, 'no endpoint configured in site.config.ts')

  test('honeypot submission is silently accepted and not delivered', async ({ request }) => {
    const r = await request.post(f.endpoint, {
      data: {
        [f.fields.name]: 'Bot', [f.fields.email]: 'bot@test.com',
        [f.fields.message]: 'spam', [f.honeypotField]: 'http://spam.example',
        [f.fields.consent]: true,
      },
      failOnStatusCode: false,
    })
    expect(
      [200, 204].includes(r.status()),
      `honeypot submission returned ${r.status()}. Return 2xx so bots learn nothing, but do not deliver the message.`
    ).toBe(true)
  })

  test('invalid email is rejected server-side', async ({ request }) => {
    const r = await request.post(f.endpoint, {
      data: {
        [f.fields.name]: 'Test', [f.fields.email]: 'notanemail',
        [f.fields.message]: 'hi', [f.fields.consent]: true,
      },
      failOnStatusCode: false,
    })
    expect(r.status(), 'server accepted an invalid email. Client-side validation alone is not a control.').toBe(400)
  })

  test('empty body is rejected server-side', async ({ request }) => {
    const r = await request.post(f.endpoint, { data: {}, failOnStatusCode: false })
    expect(r.status(), 'server accepted an empty submission').toBe(400)
  })

  test('over-length input is rejected, not crashed on', async ({ request }) => {
    const r = await request.post(f.endpoint, {
      data: {
        [f.fields.name]: 'Test', [f.fields.email]: 'test@example.com',
        [f.fields.message]: 'x'.repeat(5000), [f.fields.consent]: true,
      },
      failOnStatusCode: false,
    })
    expect(r.status(), `over-length input returned ${r.status()}, want 400 (not a 500)`).toBe(400)
  })

  test('missing consent is rejected server-side', async ({ request }) => {
    const r = await request.post(f.endpoint, {
      data: {
        [f.fields.name]: 'Test', [f.fields.email]: 'test@example.com',
        [f.fields.message]: 'hi',
      },
      failOnStatusCode: false,
    })
    expect(r.status(), 'server accepted a submission without consent').toBe(400)
  })
})
