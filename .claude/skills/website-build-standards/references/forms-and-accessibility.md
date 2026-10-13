# Forms and Accessibility

## Contact form markup

This is the baseline. Every attribute shown is required.

```html
<form action="/api/contact" method="POST" novalidate>
  <!-- Honeypot. Must be hidden from sight AND from screen readers. -->
  <div aria-hidden="true" style="position:absolute;left:-9999px">
    <label for="company_url">Leave blank</label>
    <input type="text" id="company_url" name="company_url" tabindex="-1" autocomplete="off">
  </div>

  <div class="field">
    <label for="name">Full name <span aria-hidden="true">*</span></label>
    <input type="text" id="name" name="name" required autocomplete="name"
           aria-describedby="name-error" maxlength="100">
    <p id="name-error" class="error" role="alert" hidden></p>
  </div>

  <div class="field">
    <label for="email">Email address <span aria-hidden="true">*</span></label>
    <input type="email" id="email" name="email" required autocomplete="email"
           inputmode="email" aria-describedby="email-error" maxlength="254">
    <p id="email-error" class="error" role="alert" hidden></p>
  </div>

  <div class="field">
    <label for="phone">Phone <span class="optional">(optional)</span></label>
    <input type="tel" id="phone" name="phone" autocomplete="tel" inputmode="tel"
           maxlength="20">
  </div>

  <div class="field">
    <label for="message">How can we help? <span aria-hidden="true">*</span></label>
    <textarea id="message" name="message" required rows="5" maxlength="2000"
              aria-describedby="message-error"></textarea>
    <p id="message-error" class="error" role="alert" hidden></p>
  </div>

  <div class="field field--checkbox">
    <input type="checkbox" id="consent" name="consent" required>
    <label for="consent">
      I agree to the <a href="/privacy">privacy policy</a> and consent to being
      contacted about my enquiry.
    </label>
  </div>

  <button type="submit">Send message</button>

  <!-- Status region. Announced to screen readers when it changes. -->
  <p role="status" aria-live="polite" class="form-status"></p>
</form>
```

Rules this markup enforces:
- Every input has a `<label>` with a matching `for`. A placeholder is not a label.
- `autocomplete` is set so browsers can fill the form.
- `maxlength` caps input server-side abuse at the client layer too.
- Errors live in `role="alert"` elements tied by `aria-describedby`.
- `required` on the consent checkbox, with the privacy policy linked inline.
- Button text names the action. Not "Submit".

Only these fields by default: name, email, message. Add phone only if the business
calls leads back. Every additional field needs a stated business reason. Delete any
field whose data nobody will use.

Never collect: date of birth, street address, company size, budget range, government
IDs, or payment details, unless the client explicitly requires it and a compliant
processor is in place.

## Server-side handler requirements

Client-side validation is a convenience, not a control. The handler must:

```js
// Reject if the honeypot is filled. Return success so bots learn nothing.
if (body.company_url) return new Response(null, { status: 204 });

// Required fields present
if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
  return json({ error: 'Missing required fields' }, 400);
}

// Email shape
if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(body.email)) {
  return json({ error: 'Invalid email address' }, 400);
}

// Length caps, matching the markup
if (body.name.length > 100 || body.email.length > 254 || body.message.length > 2000) {
  return json({ error: 'Input too long' }, 400);
}

// Consent recorded
if (body.consent !== true && body.consent !== 'on') {
  return json({ error: 'Consent required' }, 400);
}

// Rate limit by IP: no more than 5 submissions per hour
```

Add a CAPTCHA only if spam becomes an actual problem after launch. Honeypot plus rate
limiting handles most of it without hurting conversion or accessibility.

## Client-side validation and submission

The markup above sets `novalidate` and includes empty `role="alert"` paragraphs.
Those need this script, or the form posts natively and the user lands on a raw JSON
response. This is required, not optional.

```js
const form = document.querySelector('form[action="/api/contact"]')
const status = form.querySelector('.form-status')

const RULES = {
  name:    v => !v.trim() ? 'Enter your name' : v.length > 100 ? 'Name is too long' : '',
  email:   v => !v.trim() ? 'Enter your email address'
                : !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v) ? 'Enter a valid email address' : '',
  message: v => !v.trim() ? 'Tell us what you need' : v.length > 2000 ? 'Message is too long' : '',
}

function showError(field, msg) {
  const input = form.elements[field]
  const box = document.getElementById(`${field}-error`)
  if (box) { box.textContent = msg; box.hidden = !msg }
  if (input) {
    input.setAttribute('aria-invalid', msg ? 'true' : 'false')
    // Keeps the :invalid selector meaningful for tests and styling
    input.setCustomValidity ? input.setCustomValidity(msg) : null
  }
  return !msg
}

// Validate on blur so errors appear before submission is attempted
Object.keys(RULES).forEach(field => {
  const input = form.elements[field]
  if (input) input.addEventListener('blur', () => showError(field, RULES[field](input.value)))
})

form.addEventListener('submit', async e => {
  e.preventDefault()
  status.textContent = ''

  let valid = true
  for (const [field, rule] of Object.entries(RULES)) {
    const input = form.elements[field]
    if (!showError(field, rule(input ? input.value : ''))) valid = false
  }

  const consent = form.elements.consent
  if (consent && !consent.checked) {
    consent.setCustomValidity('Please agree to the privacy policy')
    consent.setAttribute('aria-invalid', 'true')
    status.textContent = 'Please agree to the privacy policy to continue.'
    valid = false
  } else if (consent) {
    consent.setCustomValidity('')
    consent.setAttribute('aria-invalid', 'false')
  }

  if (!valid) {
    // Move focus to the first problem so keyboard and screen reader users land on it
    const firstBad = form.querySelector('[aria-invalid="true"]')
    if (firstBad) firstBad.focus()
    return
  }

  const button = form.querySelector('button[type="submit"]')
  button.disabled = true
  status.textContent = 'Sending...'

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.elements.name.value,
        email: form.elements.email.value,
        phone: form.elements.phone ? form.elements.phone.value : '',
        message: form.elements.message.value,
        consent: consent ? consent.checked : undefined,
        company_url: form.elements.company_url ? form.elements.company_url.value : '',
      }),
    })
    if (res.ok) {
      form.reset()
      status.textContent = 'Thank you. We will reply within two business days.'
    } else {
      const body = await res.json().catch(() => ({}))
      status.textContent = body.error || 'Something went wrong. Please call us instead.'
    }
  } catch {
    status.textContent = 'Could not send. Please check your connection or call us.'
  } finally {
    button.disabled = false
  }
})
```

Why it is built this way:
- `e.preventDefault()` keeps the user on the page. A native post to a JSON endpoint
  shows them raw JSON, which is the most common form bug in AI-built sites.
- `setCustomValidity` keeps the `:invalid` pseudo-class accurate, so CSS error styling
  and automated tests both work.
- Focus moves to the first invalid field, which is what makes the error reachable for
  keyboard and screen reader users.
- The button is disabled during the request, preventing double submission.
- Errors land in `role="alert"` elements, so they are announced rather than only shown.

This is a convenience layer. The server-side checks below are the actual control.

## Form testing procedure

Do all eight. Do not report the form as working until each passes.

1. Submit with valid data. Confirm the business notification email arrives.
2. Confirm the submitter confirmation email arrives, and check the spam folder.
3. Submit with every field empty. Expect inline errors, no submission.
4. Submit with `notanemail` in the email field. Expect an error.
5. Submit with 3000 characters in the message. Expect rejection, not a server error.
6. Fill the honeypot with a script, submit. Expect no notification email.
7. Submit without checking consent. Expect rejection.
8. Tab through the entire form using only the keyboard, submit with Enter.

```bash
# Reproduce the honeypot and validation cases against a live endpoint
curl -s -X POST https://{{DOMAIN}}/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"bot@test.com","message":"spam","company_url":"http://x.com","consent":true}' \
  -o /dev/null -w "honeypot: %{http_code}\n"

curl -s -X POST https://{{DOMAIN}}/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"notanemail","message":"hi","consent":true}' \
  -o /dev/null -w "bad email: %{http_code}\n"

curl -s -X POST https://{{DOMAIN}}/api/contact \
  -H 'Content-Type: application/json' -d '{}' \
  -o /dev/null -w "empty body: %{http_code}\n"
```

Expect 204 for the honeypot, 400 for the bad email, 400 for the empty body.

## Skip link

First focusable element on the page. Visible on focus, not permanently hidden.

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header>...</header>
  <main id="main">...</main>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  padding: 0.75rem 1rem;
  background: #fff;
  color: #000;
  z-index: 100;
}
.skip-link:focus {
  left: 0;
}
```

## Focus states

Never remove an outline without replacing it.

```css
/* Wrong. Breaks keyboard navigation entirely. */
*:focus { outline: none; }

/* Right. Visible ring on keyboard focus only, not on mouse click. */
:focus-visible {
  outline: 2px solid {{BRAND_HEX}};
  outline-offset: 2px;
}
```

Verify no suppressed outlines ship:

```bash
grep -rn "outline:\s*none\|outline:\s*0" --include="*.css" --include="*.scss" \
  --include="*.tsx" --include="*.jsx" . | grep -v node_modules
```

Every hit must be paired with a `:focus-visible` replacement in the same file.

## Reduced motion

Wrap every animation and transition.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Alt text

```html
<!-- Meaningful image: describe content and purpose -->
<img src="/kitchen-remodel-tucson.jpg"
     alt="Renovated kitchen with white shaker cabinets and a quartz island">

<!-- Image containing text: repeat the text -->
<img src="/certified-badge.png" alt="Certified Master Plumber, Arizona license 12345">

<!-- Image inside a link: describe the destination, not the picture -->
<a href="/services/roofing"><img src="/roof.jpg" alt="Roofing services"></a>

<!-- Decorative only: empty alt, never a missing alt -->
<img src="/divider-swoosh.svg" alt="">
```

Never: the filename, "image of", "photo of", or keyword stuffing.

Find missing alt attributes:

```bash
grep -rn '<img' --include="*.html" --include="*.tsx" --include="*.jsx" . \
  | grep -v node_modules | grep -v 'alt='
```

## Color contrast

Minimums: 4.5:1 for body text, 3:1 for text at 18pt+ or 14pt+ bold, 3:1 for UI
component borders and icons.

Check every state, not just the default: hover, focus, disabled, error, visited. Check
text over images and gradients at the point where the background is lightest.

Measure it, do not judge it by eye:

```bash
# Automated scan of the live page, includes contrast violations
npx @axe-core/cli https://{{DOMAIN}} --tags wcag2a,wcag2aa

# Second opinion across several pages
npx pa11y https://{{DOMAIN}} --standard WCAG2AA
npx pa11y https://{{DOMAIN}}/contact --standard WCAG2AA
```

For individual color pairs, use https://webaim.org/resources/contrastchecker/ and
record the ratio in the handoff report.

## Mobile

Test at these widths: 375, 390, 414, 768, 1024, 1280, 1920.

Requirements:
- Tap targets at least 44x44px, with spacing between adjacent targets
- No horizontal page scroll at any width
- Body text at least 16px, form inputs at least 16px so iOS does not zoom on focus
- Navigation reachable with one thumb, menu closes on selection and on outside tap
- Wide tables and code blocks scroll inside their own container, not the page

Find the element causing horizontal overflow, run in the browser console:

```js
document.querySelectorAll('*').forEach(el => {
  if (el.scrollWidth > document.documentElement.clientWidth) console.log(el);
});
```

Find inputs that will trigger iOS zoom:

```js
document.querySelectorAll('input, select, textarea').forEach(el => {
  const size = parseFloat(getComputedStyle(el).fontSize);
  if (size < 16) console.log(size, el);
});
```

Verify on real mobile Safari before launch. A resized desktop window does not
reproduce iOS input zoom, viewport unit behavior, or momentum scrolling.
