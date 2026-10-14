---
name: website
description: Build and launch standards for client websites, with copy-paste markup, exact file contents, and verification commands. Use whenever building, redesigning, or launching a website or landing page, and whenever writing website copy, designing a hero section, building a contact form, or adding legal, SEO, favicon, or analytics setup. Covers 24 required launch items (privacy policy, terms, robots.txt, sitemap, favicon, canonical URLs, cookie consent, meta tags, 404, alt text, contrast, mobile, forms, analytics, performance) plus a banned list for AI-looking design and copy (no purple gradients, no fake metrics or reviews, no pill buttons, no emoji icons, no AI images, no em dashes, no AI copy) with a scanner that detects violations. Load before writing the first line of markup or copy, not as a review pass at the end.
---

# Website Build Standards

Two halves. **Required** items must be present before launch. **Prohibited** items must
never appear. Substituting one prohibited pattern for another does not count.

Nothing here is a suggestion to interpret. Every item has exact markup or file
contents in `references/`, and a command that proves it is done. Writing the code is
not verification. Run the command and record the output.

## Files

| File | Holds |
|---|---|
| `references/launch-checklist.md` | The 24 required items, each with its spec location and verify command |
| `references/head-tags.md` | The full `<head>` block, title and description rules, OG image, JSON-LD |
| `references/site-files.md` | robots.txt, sitemap.xml, site.webmanifest, favicon generation, 404, redirects, security headers |
| `references/forms-and-accessibility.md` | Contact form markup, server-side validation, the 8-case form test, skip link, focus states, alt text, contrast, mobile |
| `references/performance-and-verification.md` | Lighthouse, image and font commands, broken links, analytics verification, the full pre-launch sweep |
| `references/legal-pages.md` | Privacy policy and terms templates with tokens, cookie consent implementation, footer |
| `references/copy-and-design-rules.md` | The banned phrase list, hero and CTA rewrites, design specifics with the CSS to avoid |
| `references/automated-verification.md` | The Playwright suite: install, configure, run, what each spec covers, and what it does not |
| `references/staging-workflow.md` | One-time project setup: staging branch, Netlify branch deploys, CLAUDE.md, keeping internal files off the public site |
| `scripts/scan-copy.sh` | Static scanner. Greps source for every banned phrase and prohibited pattern. Exit 0 required before launch. |
| `scripts/install-playwright.sh` | Installs the Playwright verification suite into a project |
| `templates/playwright/` | The suite itself: config plus seven spec files |
| `scripts/test-scanner.sh`, `scripts/test-playwright.sh` | Regression tests for the scanner and the suite, run against compliant and deliberately broken fixtures |

## Workflow

**0. Project setup.** First time on a project, follow
`references/staging-workflow.md`: inventory open pull requests before changing the
workflow, commit the rule to the default branch, branch staging from that same
commit, enable Netlify branch deploys, bootstrap with an empty commit, and exclude
`CLAUDE.md` and other internal files from the published site. Skip this on a project
that already has a staging branch with a working preview URL.

**1. Intake.** Collect before writing anything: business legal name, address, phone,
support email, domain, logo files, brand hex colors, jurisdiction for legal pages,
analytics ID, form destination, real photos, real testimonials, and any specific
numbers they want to claim. Missing photos, testimonials, or numbers are noted as gaps
now. They are never filled with invented substitutes later.

**2. Build.** Apply `references/copy-and-design-rules.md` to every copy and design
decision as you make them, not afterwards. Use the markup in `head-tags.md`,
`site-files.md`, and `forms-and-accessibility.md` directly rather than writing your
own version.

**3. Scan the source.** Run the static scanner and fix every finding:

```bash
.claude/skills/website-build-standards/scripts/scan-copy.sh .
```

It checks 16 categories: banned phrases, em dashes, emoji, pill buttons, purple
gradients, animated counters, custom cursors, suppressed focus outlines, unrequested
widgets, unfilled tokens, placeholder links, missing alt, missing image dimensions,
unsafe `target="_blank"`, and missing canonical or description tags.

**4. Verify the running site.** Install the Playwright suite once per project, set
`site.config.ts`, then run it:

```bash
.claude/skills/website-build-standards/scripts/install-playwright.sh .
cd verification && npm run verify
```

It covers most of the checklist as code: SEO tags and lengths, root files, 404
status, sitemap integrity, axe accessibility and contrast, seven viewports, tap
targets, form validation on both the client and the server, link integrity, console
errors, and the prohibitions checked against rendered output. See
`references/automated-verification.md`, including the list of what it does NOT cover.

**5. Verify the rest by hand.** Lighthouse, email delivery, a real phone, the social
preview debuggers, and Google's Rich Results Test. Commands and procedures are in
`references/performance-and-verification.md` and the checklist.

**6. Hand off.** Produce the handoff report at the end of the checklist. Separate what
you verified from what you only built.

## Prohibited, with the correct alternative

| Never | Instead |
|---|---|
| Purple gradient, or the violet-blue-pink hero gradient | The client's brand colors, flat. Absent those, one solid color or a real photograph with a solid overlay. |
| Vague hero text ("Transform your business", "Elevate your experience", "Unlock your potential") | `{{SERVICE}} in {{LOCATION}}{{, QUALIFIER}}`. "Kitchen remodeling in Tucson, licensed since 1998." A stranger knows what is sold in three seconds. |
| Fake counters (numbers animating up on scroll) | Real numbers as static text, only if the client supplied them. |
| Fake reviews (invented testimonials, placeholder names, stock photo faces) | Real testimonials with real attribution. No reviews yet means no reviews section. |
| Pill-shaped buttons (`border-radius: 9999px`, `rounded-full`) | 4px to 8px radius, consistent sitewide. |
| Emoji icons | One real icon family (Lucide, Heroicons, Phosphor), or no icons. |
| Fake metrics ("99.9% satisfaction", "500+ happy clients", "trusted by thousands") | Delete the claim. Describe what the business does. Report the deletion so the client can supply the real figure. |
| Cursor animations (custom cursors, trailing dots, magnetic hover, spotlight) | The default system cursor. `cursor: pointer` on interactive elements. |
| AI-generated images (heroes, illustrations, headshots) | The client's real photos. Absent those, licensed stock, or a text-and-color layout with no imagery. Flag the photo gap. |
| Em dashes in copy | A comma, colon, period, or parentheses. Restructure the sentence if needed. |
| AI copy ("in today's fast-paced world", "it's not just X, it's Y", "seamlessly", "robust", "leverage", "elevate", "unlock", "delve", uniform three-sentence paragraphs) | Short declarative sentences. Concrete nouns. The words the client used about their own business. Vary sentence length. Full banned list in `references/copy-and-design-rules.md`. |
| Any "made with AI", "Built with Claude", or AI tool badge | Footer holds the client's copyright, legal links, contact, and the agency credit. Nothing else. An AI badge says nobody was accountable; an agency credit says a firm stands behind the work. |

### Also avoid

Parallax and scroll jacking. Reveal-on-scroll on every section. Auto-playing video
with sound. Auto-rotating carousels. Glassmorphism as the primary visual device. Lorem
ipsum anywhere, including alt text and meta tags. Placeholder `href="#"` links. The
three-column icon grid with a two-word heading and two sentences, unless there are
genuinely three things to say. Dark mode toggles, chat widgets, newsletter popups, and
exit-intent modals the client did not request. Stock photos of a diverse team pointing
at a whiteboard.

## Non-negotiables

- Every factual claim traces to something the client provided. No source means no
  claim, and the removal goes in the handoff report.
- Generated legal copy is a draft requiring attorney review. Never call it approved.
- Collect only data the business will use. Default to name, email, message.
- Report measured Lighthouse numbers. Never claim a site is fast without running it.
- `scan-copy.sh` must exit 0 and `npm run verify` must pass before launch.
- New builds carry `Website by <a rel="nofollow noopener">Duo Group</a>` in the
  footer, with written client consent. Existing sites are not retrofitted. The
  `nofollow` is required: an identical sitewide footer link across a portfolio is
  the pattern Google's link spam guidance names, and a credit is for referral
  traffic, not PageRank. Markup in `legal-pages.md`, enforced by `verify:design`.
- `CLAUDE.md` ships with the site and is readable at `/CLAUDE.md` on a static host.
  Keep infrastructure details out of the public build. `verify:seo` asserts this.
- Record known-failing checks and why they are accepted, in `CLAUDE.md`. Otherwise
  the next session "fixes" a deliberate tradeoff.
- Re-read every setting written through an API. A success response is not
  confirmation that the value was stored.
- A passing suite is not a verified site. Email delivery, Lighthouse, and real device
  behaviour are not covered by it. Say so in the handoff rather than implying they are.
