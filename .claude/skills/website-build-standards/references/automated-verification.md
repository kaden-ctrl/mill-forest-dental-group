# Automated Verification

A Playwright suite that runs most of the launch checklist as code. It replaces the
checks a person would otherwise do by hand, inconsistently, at the end of a build.

## Install into a project

```bash
.claude/skills/website-build-standards/scripts/install-playwright.sh .
```

This creates `verification/` with the config, the specs, and `package.json`, installs
dependencies, and downloads Chromium if needed. Re-running it refreshes the specs and
leaves your `site.config.ts` alone.

## Configure

`verification/site.config.ts` is the only file to edit per project:

| Field | Set it to |
|---|---|
| `baseURL` | dev server during the build, the live domain before launch |
| `pages` | every public page, matching sitemap.xml |
| `form` | the contact form's page, selector, endpoint, and field names |
| `analyticsId` | the GA4 measurement ID, or `''` to skip the analytics tests |
| `design` | radius ceiling, tap target and input font minimums, font family cap |
| `rootFiles` | files that must exist at the root |
| `privatePaths` | files that must NOT be publicly reachable |
| `skipLinkHosts` | external hosts that block crawlers |

## Run

```bash
cd verification && npm run verify                      # everything
SITE_URL=https://clientdomain.com npm run verify       # against the live site
```

Individual suites, which is what you want while iterating:

```bash
npm run verify:seo         npm run verify:a11y        npm run verify:forms
npm run verify:design      npm run verify:links       npm run verify:console
npm run verify:responsive  npm run verify:mobile      npm run report
```

Mobile Safari is the only engine that reproduces real iOS behaviour: input zoom,
viewport unit handling, momentum scrolling. It needs one extra download:

```bash
npx playwright install webkit
npm run verify:safari
```

## What each spec covers

**`seo.spec.ts`** Title length and uniqueness, description length and uniqueness,
canonical presence and self-reference, single h1, complete Open Graph set,
`twitter:card`, `lang`, no placeholder text, alt on every image, explicit image
dimensions, `rel=noopener`, root files returning 200, 404 returning status 404,
robots.txt referencing the sitemap, every sitemap URL returning 200, sitemap
excluding thank-you and error pages, JSON-LD present and parseable with an
Organization or LocalBusiness type. Also that internal files are not publicly
reachable (`CLAUDE.md`, `README.md`, `.env`, `netlify.toml`, `package.json`,
`.git/config`, configurable via `privatePaths`), that the 404 page links back into
the site rather than dead-ending, and that it exposes no server paths or stack
traces. The exposure test fingerprints the not-found body first, so a host that
soft-404s reports one root cause instead of one finding per path.

**`responsive.spec.ts`** Runs in seven viewports. Horizontal overflow, naming the
offending elements and their measured widths. Tap target sizes, measuring a labelled
checkbox as box-plus-label and exempting links inline in prose. Input font sizes
below the iOS zoom threshold. A call to action within the first screen.

**`accessibility.spec.ts`** axe-core against WCAG 2.0 and 2.1 A and AA, color
contrast reported with measured ratios and the exact colors, skip link as the first
focusable element, a visible focus indicator, heading levels descending without
skips, and no animation surviving `prefers-reduced-motion`.

**`forms.spec.ts`** Labels on every input, autocomplete attributes, a submit button
that names the action, a required consent checkbox linking to the privacy policy, a
honeypot that is imperceptible and `tabindex="-1"`, keyboard reachability of the
submit button, and rejection of empty, invalid-email, and no-consent submissions
without navigating the user away. Then endpoint tests proving server-side validation
exists: honeypot, bad email, empty body, over-length input, missing consent.

**`links.spec.ts`** Internal links resolving, no `href="#"`, `tel:` in `+1` plus ten
digits, well-formed and non-placeholder `mailto:`, privacy and terms linked from
every footer, external links resolving.

**`console.spec.ts`** Zero console errors and zero failed network requests on every
page. Analytics tag present on every page, and not firing before consent.

**`design.spec.ts`** The prohibitions, checked against rendered output rather than
source: pill radius measured against element height, purple gradients detected by
parsing computed `background-image` colors, emoji in rendered text, custom cursors,
numbers that change after load, font family count, AI build credits, unsupported
numeric claims, and a vague h1.

`design.spec.ts` and `scan-copy.sh` overlap deliberately. The scanner greps source
files and catches things before the site runs. The spec checks what the browser
actually paints, so it catches violations arriving through utility classes, CSS
variables, or third-party components, which a source grep cannot see.

## What it does NOT cover

Do not report these as verified because the suite passed:

- **Lighthouse and Core Web Vitals.** Run separately, see
  `performance-and-verification.md`.
- **Email delivery.** No test can confirm the notification and confirmation emails
  arrived. Submit the form yourself and check both inboxes, including spam.
- **Real device behaviour.** The mobile viewports are Chromium at a mobile size.
  Install webkit for the closest approximation, and still open the site on a real
  phone before launch.
- **Social preview rendering.** The suite checks the tags exist and the image
  dimensions are declared. Only the platform debuggers show the actual card.
- **Structured data acceptance.** The suite checks the JSON parses and the type is
  right. Google's Rich Results Test is the authority on whether it is eligible.
- **Legal accuracy.** No test reads the privacy policy. Attorney review still applies.
- **Whether a claim is true.** `design.spec.ts` flags unsourced-looking numbers. It
  cannot tell a real figure from an invented one. That judgement stays with you.

## Regression test

The specs themselves are tested, against a standards-compliant fixture site and a
deliberately broken one:

```bash
.claude/skills/website-build-standards/scripts/test-playwright.sh
```

The compliant fixture must produce zero failures and the broken one must produce at
least forty. Run it after editing any spec. A spec that passes on both fixtures is
testing nothing, and a spec that fails on the compliant fixture is a false positive
that will train you to ignore the suite.
