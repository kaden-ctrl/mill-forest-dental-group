# Launch Checklist

The 24 required items. Bracketed numbers are the source list's own numbering.

Each item names the file holding its exact markup or file contents, and the command
that proves it is done. Writing the code is not verification. Run the command.

Set the domain once before working through the commands:

```bash
D=clientdomain.com
```

## Legal and data

**[1] Privacy policy** at `/privacy`
Spec: `legal-pages.md`, privacy policy section. Fill every token from intake.
Must list every third party that actually receives data. Cross-check against the
live site's network requests, command in that file.
```bash
curl -so /dev/null -w "privacy: %{http_code}\n" https://$D/privacy
```
Tell the client in writing that it needs attorney review.

**[2] Terms page** at `/terms`
Spec: `legal-pages.md`, terms section. Governing law must name the client's actual
state, never a placeholder.
```bash
curl -so /dev/null -w "terms: %{http_code}\n" https://$D/terms
```

**[14] Cookie consent**
Spec: `legal-pages.md`, cookie consent section. First determine whether a banner is
needed at all:
```bash
curl -sI https://$D | grep -i "set-cookie"
```
Only framework session cookies means no banner is needed. Say so in the handoff
instead of adding one. If a banner is required, verify in a fresh private window that
devtools Network filtered to `collect` shows zero requests before consent is clicked.

**[21] Collect only necessary data**
Spec: `forms-and-accessibility.md`. Default fields are name, email, message. Every
extra field needs a stated business reason. Delete fields whose data nobody will use.

## Copy

**[3] Clear CTA**
Spec: `copy-and-design-rules.md`, CTA section. One primary action per page, visible
without scrolling on mobile and desktop. Every page has a next step.

**[23] Clear button labels**
Spec: `copy-and-design-rules.md`, label table. Name the action, not the interface.
"Send message", never "Submit".

**[16] FAQs**
At least five real questions customers ask. Not filler. Mark up with `FAQPage`
JSON-LD, block in `head-tags.md`.
```bash
curl -s https://$D/faq | grep -c "FAQPage"   # want 1 or more
```

**[22] Remove unsupported claims**
Spec: `copy-and-design-rules.md`, unsupported claims section. Every number, award,
certification, and year must trace to something the client provided. No source means
delete it. Every removal goes in the handoff report.
```bash
.claude/skills/website-build-standards/scripts/scan-copy.sh .
```

## Technical SEO

**[9] Meta titles** and **[10] Meta descriptions**
Spec: `head-tags.md`. Titles 50 to 60 chars, descriptions 140 to 155, unique per page.
The title-length loop and the missing-tag greps are in that file.
```bash
grep -rL 'name="description"' --include="*.html" . | grep -v node_modules
```

**[13] Canonical URLs**
Spec: `head-tags.md` for the tag, `site-files.md` for the host and HTTPS redirects.
```bash
curl -sIL http://$D       | grep -E "^(HTTP|location:)"
curl -sIL https://www.$D  | grep -E "^(HTTP|location:)"
```
One 301 to the canonical host. Watch for chains.

**[4] robots.txt**
Exact contents in `site-files.md`. Staging must disallow everything.
```bash
curl -s https://$D/robots.txt
```

**[5] sitemap.xml**
Exact contents in `site-files.md`. No 404 page, no thank-you pages, no http URLs.
```bash
curl -s https://$D/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | while read -r u; do printf "%s %s\n" "$(curl -so /dev/null -w '%{http_code}' "$u")" "$u"; done
```
Every line must start with 200.

**[11] Social share**
Spec: `head-tags.md`. Image exactly 1200x630, under 1MB, real logo or photo.
```bash
curl -s https://$D | grep -oE 'og:(title|description|image|url)[^>]*'
```
Then confirm the preview renders in the three debuggers listed in that file.

**[12] Favicon**
Generation commands and required files in `site-files.md`.
```bash
for f in favicon.ico favicon.svg apple-touch-icon.png icon-192.png icon-512.png site.webmanifest; do
  printf "%s %s\n" "$(curl -so /dev/null -w '%{http_code}' https://$D/$f)" "$f"
done
```
All 200. Then open the site in a real browser and confirm the icon shows in the tab.
Hard refresh, favicons cache hard.

**[6] Custom 404**
Markup in `site-files.md`. Must return status 404, not 200.
```bash
curl -so /dev/null -w "%{http_code}\n" https://$D/definitely-not-a-real-page
```

## Accessibility

**[7] Alt text**
Patterns in `forms-and-accessibility.md`. Decorative images get `alt=""`, never a
missing attribute.
```bash
grep -rn '<img' --include="*.html" --include="*.tsx" . | grep -v node_modules | grep -v 'alt='
```
Must return nothing.

**[24] Color contrast**
Minimums and per-state rules in `forms-and-accessibility.md`.
```bash
npx @axe-core/cli https://$D --tags wcag2a,wcag2aa
```
Record the measured ratios in the handoff. Do not judge contrast by eye.

**[17] Accessibility**
Skip link, focus states, reduced motion, and the full requirement list in
`forms-and-accessibility.md`.
```bash
npx pa11y https://$D --standard WCAG2AA
npx pa11y https://$D/contact --standard WCAG2AA
```
Then tab through every page using only the keyboard.

**[15] Mobile version**
Widths, tap targets, and the overflow-finding console snippets are in
`forms-and-accessibility.md`. Test on real mobile Safari, not a resized desktop
window.

## Functionality

**[18] Test forms**
Markup, server-side handler requirements, and the eight-case test procedure are in
`forms-and-accessibility.md`. The curl cases for honeypot, bad email, and empty body
are there too. Confirm both emails arrive, including checking the spam folder.

**[19] Check broken links**
```bash
npx linkinator https://$D --recurse
```
Also verify `mailto:` and `tel:` values, greps in
`performance-and-verification.md`. `tel:` must be `+1` plus ten digits.

**[8] Analytics**
Verification procedure in `performance-and-verification.md`. Installing the snippet is
not verification. Confirm the event arrives in GA4 Realtime.
```bash
for p in "" services about contact faq privacy terms; do
  printf "%s " "$p"; curl -s "https://$D/$p" | grep -c "G-MEASUREMENT_ID"
done
```
Every page 1 or more. Install only what the client asked for.

**[20] Optimize performance**
Targets, image and font commands, and the Lighthouse score extraction are in
`performance-and-verification.md`.
```bash
npx lighthouse https://$D --output=json --output-path=./lh.json --quiet --chrome-flags="--headless"
node -e 'const c=require("./lh.json").categories;for(const k in c)console.log(k,Math.round(c[k].score*100))'
```
Run three times, report the median. Report real numbers, never an estimate.

## Automated coverage

Most of the items above run as code. Install the suite once per project:

```bash
.claude/skills/website-build-standards/scripts/install-playwright.sh .
```

Set `verification/site.config.ts`, then:

```bash
cd verification && npm run verify
```

| Checklist items | Covered by |
|---|---|
| [4] [5] [6] [9] [10] [11] [13] [7] | `npm run verify:seo` |
| [17] [24] | `npm run verify:a11y` |
| [15] [3] | `npm run verify:responsive` |
| [18] [21] | `npm run verify:forms` |
| [19] | `npm run verify:links` |
| [8] | `npm run verify:console` |
| [22] [23] and the prohibitions | `npm run verify:design` |

Still manual, and not covered by a passing suite: [1] and [2] attorney review,
[14] the consent decision, [12] confirming the favicon renders in a real browser tab,
[16] whether the FAQ answers are real questions, [20] Lighthouse, form email
delivery, and a real phone. Details in `automated-verification.md`.

## Final sweep

Run the static scanner and the browser suite. Both must pass before launch.

```bash
.claude/skills/website-build-standards/scripts/scan-copy.sh .
cd verification && npm run verify
```

The combined pre-launch command block is at the end of
`performance-and-verification.md`.

## Handoff report

Produce this in writing at the end of every build.

**Verified complete.** Items checked with the command above, with the output.

**Built but unverified.** What you implemented but could not test, and exactly what
blocks verification: no live domain, no GA4 access, no mail credentials.

**Not done.** Item and reason.

**Needs client action.** Attorney review of privacy and terms. DNS changes. Search
Console sitemap submission. Missing photos. Missing testimonials.

**Measured numbers.** Lighthouse performance, accessibility, best practices, SEO. LCP,
CLS, TBT. Page weight. Actual values from the commands, not estimates.

**Removed content.** Every claim, number, award, or section deleted for lack of a
source, listed so the client can supply the real version.

**Scanner and suite output.** The final `scan-copy.sh` result and the
`npm run verify` summary. If anything still fails, list it and say why it is
acceptable.

**Not covered by automation.** State plainly that Lighthouse, email delivery, real
device behaviour, social preview rendering, structured data eligibility, and legal
accuracy were checked by hand or not at all. A passing test suite is not a verified
site.
