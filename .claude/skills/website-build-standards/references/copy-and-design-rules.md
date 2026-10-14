# Copy and Design Rules

The prohibitions table in SKILL.md says what not to do. This file is how to detect it
and what to write instead.

Run `scripts/scan-copy.sh` against the build before launch. It greps for every banned
phrase and pattern below.

## Banned phrases, literal list

Every one of these is a hit. Rewrite the sentence, do not swap in a synonym.

**Opener cliches**
`in today's fast-paced world`, `in today's digital age`, `in an increasingly`,
`now more than ever`, `gone are the days`, `whether you're a`, `look no further`,
`welcome to our website`, `we are thrilled to`, `we are excited to announce`

**Empty verbs and adjectives**
`seamless`, `seamlessly`, `robust`, `leverage`, `elevate`, `unlock`, `unleash`,
`empower`, `delve`, `navigate the landscape`, `tailored to your needs`,
`cutting-edge`, `state-of-the-art`, `world-class`, `best-in-class`,
`industry-leading`, `game-changing`, `revolutionary`, `innovative solutions`,
`comprehensive suite`, `holistic approach`, `synergy`, `bespoke`, `curated`,
`meticulously`, `effortlessly`, `transformative`, `next-level`, `supercharge`,
`turnkey`, `end-to-end solution`, `one-stop shop`

**The AI sentence shapes**
`it's not just X, it's Y`, `more than just`, `isn't just about`,
`that's where we come in`, `the result? `, `the best part? `, `here's the thing`,
`let's dive in`, `at the end of the day`, `when it comes to`

**Unverifiable superlatives**
`trusted by thousands`, `trusted by hundreds`, `award-winning`, `#1 in`,
`the leading`, `premier`, `renowned`, `unmatched`, `unparalleled`, `second to none`,
`customers love us`, `satisfaction guaranteed`

**Vague hero text**
`transform your business`, `elevate your experience`, `unlock your potential`,
`take it to the next level`, `your success is our mission`, `quality you can trust`,
`experience the difference`, `where X meets Y`, `redefining`, `reimagining`

**Punctuation**
Em dash `—`, en dash `–` used as an em dash, and the `... ` ellipsis as a dramatic
pause. Use a comma, a colon, a period, or parentheses. Restructure the sentence if
none of those work.

## Hero text, concrete

The hero must answer: what is sold, to whom, where. A stranger should know within
three seconds.

| Never | Write instead |
|---|---|
| Transform your business with innovative solutions | Bookkeeping for Arizona construction contractors |
| Elevate your outdoor living experience | Paver patios and retaining walls in Scottsdale |
| Your trusted partner in home comfort | Air conditioning repair in Tucson, same-day service |
| Welcome to Smith & Co | Commercial roofing, Phoenix metro, licensed since 1994 |
| Quality you can trust | Family dentistry in Mesa, accepting new patients |

Formula that works: `{{SERVICE}} in {{LOCATION}}{{, QUALIFIER}}`. The qualifier is a
real fact: a licence, a year, an availability, a specialty. Not an adjective.

Subhead adds one concrete detail: service area, hours, price range, credential,
response time. Only if the client supplied it.

## CTA and button labels

| Never | Write instead |
|---|---|
| Submit | Send message |
| Learn more | See pricing / View our process |
| Click here | Download the guide |
| Get started | Book a free estimate |
| Contact us (on a button to a form) | Request a quote |
| Read more | Read the full case study |

Rules:
- One primary action per page, visible without scrolling on mobile and desktop
- The label names the action and its outcome
- The same action uses the same label everywhere on the site
- Single-word labels only on obvious controls: Search, Close, Next, Menu
- Every page has a next step. No page dead-ends.

## Unsupported claims

Delete anything you cannot trace to something the client provided. No source means no
claim. The removal goes in the handoff report so the client can supply the real
figure.

Specifically delete, unless the client gave you the number in writing:
- years in business, founding year
- number of customers, projects, installations
- satisfaction percentages, review averages
- response or turnaround times
- awards, rankings, "voted best"
- certifications and licence numbers
- team size
- warranty or guarantee terms

Replace a deleted claim with what the business does, not with a softer claim.

```
Before: Trusted by over 500 happy homeowners across Arizona
After:  Residential electrical work across the Phoenix metro area
```

## Testimonials

Only real ones, with real attribution, supplied by the client. If there are none, the
section does not exist. Do not build the section with placeholder quotes intending to
fill it later, and do not generate example reviews to show the layout.

If the client has reviews on Google or Facebook, ask for permission and quote them
verbatim with first name and last initial. Do not paraphrase a review.

No stock photo faces next to a testimonial. Either the client's real photo of the
customer, or no photo.

## Design specifics

**Buttons**

```css
/* Never: fully rounded */
.button { border-radius: 9999px; }

/* Correct: small radius, consistent sitewide */
.button { border-radius: 6px; }
```

**Backgrounds**

```css
/* Never: the AI-site purple gradient, in any of its forms */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
background: linear-gradient(to right, #8b5cf6, #ec4899);
background: linear-gradient(90deg, #a855f7, #3b82f6);

/* Correct: the client's brand color, flat */
background: {{BRAND_HEX}};
/* Or a real photograph with a solid overlay for contrast */
background: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/real-photo.webp');
```

**Icons**

Never emoji as a UI or feature icon. One icon family, used throughout: Lucide,
Heroicons, or Phosphor. Or no icons at all, which is usually better than a weak set.

```html
<!-- Never -->
<div class="feature"><span>🚀</span><h3>Fast Service</h3></div>

<!-- Correct -->
<div class="feature">
  <svg aria-hidden="true" width="24" height="24"><use href="#icon-clock"/></svg>
  <h3>Same-day appointments</h3>
</div>
```

Decorative icons get `aria-hidden="true"`. An icon that is the only content of a
button needs an accessible label.

**Counters and metrics**

No number that animates on scroll. Real numbers are static text. A number with no
source does not appear at all.

```html
<!-- Never -->
<div class="counter" data-target="500">0</div><p>Happy clients</p>

<!-- Correct, only with a client-supplied figure -->
<p><strong>Licensed in Arizona since 1998.</strong></p>
```

**Cursor**

The default system cursor. `cursor: pointer` on interactive elements. No custom
cursor, no trailing dot, no magnetic hover, no spotlight follow.

```bash
grep -rn "cursor:\s*url(\|custom-cursor\|cursor-follow\|magnetic" \
  --include="*.css" --include="*.js" --include="*.tsx" . | grep -v node_modules
```

**Images**

No AI-generated heroes, illustrations, or headshots. Use the client's real photos. If
they have none, use properly licensed stock or build a text-and-color layout with no
imagery, and flag the photo gap in the handoff report as something the client should
fix.

No stock photo of a diverse team pointing at a whiteboard.

**Motion**

No parallax, no scroll jacking, no reveal-on-scroll applied to every section. A single
restrained fade on the hero is the ceiling. All motion respects
`prefers-reduced-motion`.

**Layout**

No three-column icon grid with a two-word heading and two sentences per column, unless
there are genuinely three things to say. If there are two, use two. If there are five,
use a list.

**Unrequested additions**

Do not add, unless the client asked: dark mode toggle, chat widget, newsletter popup,
exit-intent modal, cookie banner on a site with no non-essential cookies, carousel,
auto-playing video, glassmorphism as the primary visual device.

**Footer**

The client's copyright, legal links, contact details, and the agency credit:
`Website by <a href="https://duogroup.com" rel="nofollow noopener">Duo Group</a>`.
Required on new builds with written client consent, not retrofitted to existing
sites. No "made with AI", no "Built with Claude", no AI tool badge. Full rules in
`legal-pages.md`.

```bash
grep -rniE "made with (ai|claude)|built with (ai|claude)|generated by ai|powered by ai|ai-generated" \
  --include="*.html" --include="*.tsx" --include="*.jsx" . | grep -v node_modules
```

Must return nothing.
